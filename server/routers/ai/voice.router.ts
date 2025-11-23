/**
 * AI Voice Router
 * 
 * Consolidated router for all AI voice/audio services including:
 * - Audio transcription (speech-to-text)
 * - Voice command processing
 * - Real-time streaming transcription
 * 
 * Base path: /api/ai/voice
 */

import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { storage } from "../../storage/index";
import { z } from "zod";
import multer from "multer";
import { getOpenAIClient } from "../../config/openai-config";
import { rateLimiters } from "../../middleware/rateLimit";
import {
  AIError,
  handleOpenAIError,
  createErrorResponse,
} from "../../utils/ai-error-handler";
import { getCircuitBreaker } from "../../utils/circuit-breaker";
import fs from "fs";
import path from "path";
import os from "os";

const router = Router();

// Initialize OpenAI client
const openai = getOpenAIClient();

// Circuit breaker for OpenAI calls
const openaiBreaker = getCircuitBreaker("openai-voice");

// Configure multer for audio uploads
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "audio/m4a",
      "audio/flac",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."));
    }
  },
});

// ==================== VALIDATION SCHEMAS ====================

const transcribeSchema = z.object({
  language: z.string().optional(),
  prompt: z.string().optional(),
  title: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

const voiceCommandSchema = z.object({
  command: z.string().min(1).max(500),
  context: z.object({
    currentPage: z.string().optional(),
    selectedItems: z.array(z.string()).optional(),
    userPreferences: z.record(z.any()).optional(),
  }).optional(),
});

const editTranscriptSchema = z.object({
  editedTranscript: z.string(),
  editReason: z.string().optional(),
});

const exportFormatSchema = z.enum(['txt', 'srt', 'vtt', 'json']);

// ==================== HELPER FUNCTIONS ====================

/**
 * Process voice command and determine action
 */
async function interpretVoiceCommand(
  command: string,
  context?: any
): Promise<any> {
  if (!openai) {
    throw new Error("OpenAI not configured");
  }

  const prompt = `Interpret this voice command for a kitchen management app:

Command: "${command}"
${context ? `Context: ${JSON.stringify(context)}` : ''}

Determine the user's intent and provide:
1. Action type (e.g., add_item, search_recipe, set_timer, create_list, etc.)
2. Parameters for the action
3. Confidence level (0-1)
4. Alternative interpretations if ambiguous

Common actions:
- Add items to inventory/shopping list
- Search for recipes
- Set cooking timers
- Create meal plans
- Ask cooking questions

Format as JSON with fields: action, parameters, confidence, alternatives.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0]?.message?.content || "{}");
}

/**
 * Format transcript for export
 */
function formatTranscript(transcript: string, format: string, metadata?: any): string {
  switch (format) {
    case 'txt':
      return transcript;
      
    case 'srt':
      // Simple SRT format (would need timestamps for real implementation)
      const lines = transcript.split('. ');
      return lines.map((line, index) => 
        `${index + 1}\n00:00:${String(index * 5).padStart(2, '0')},000 --> 00:00:${String((index + 1) * 5).padStart(2, '0')},000\n${line.trim()}\n`
      ).join('\n');
      
    case 'vtt':
      // WebVTT format
      const vttLines = transcript.split('. ');
      return `WEBVTT\n\n` + vttLines.map((line, index) => 
        `00:00:${String(index * 5).padStart(2, '0')}.000 --> 00:00:${String((index + 1) * 5).padStart(2, '0')}.000\n${line.trim()}\n`
      ).join('\n');
      
    case 'json':
      return JSON.stringify({
        transcript,
        metadata,
        segments: transcript.split('. ').map((line, index) => ({
          text: line.trim(),
          start: index * 5,
          end: (index + 1) * 5,
        })),
      }, null, 2);
      
    default:
      return transcript;
  }
}

// ==================== TRANSCRIPTION ENDPOINTS ====================

/**
 * POST /api/ai/voice/transcribe
 * Transcribe an uploaded audio file using OpenAI Whisper
 */
router.post("/transcribe", isAuthenticated, upload.single("audio"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!openai) {
      return res.status(503).json({ 
        error: "AI service not configured",
        message: "OpenAI API key is required for this feature."
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }
    
    const validation = transcribeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { language, prompt, title, temperature = 0 } = validation.data;
    
    // Create a readable stream from the uploaded file
    const audioFile = fs.createReadStream(req.file.path) as any;
    audioFile.name = req.file.originalname;
    
    try {
      // Call OpenAI Whisper API
      const transcription = await openaiBreaker.execute(async () => {
        return await openai!.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: language || undefined,
          prompt: prompt || undefined,
          response_format: "verbose_json",
          temperature,
        });
      });
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      // Save transcription to database
      const savedTranscription = await storage.platform.ai.createTranscription(userId, {
        audioUrl: `/uploads/audio/${req.file.filename}`,
        transcript: transcription.text,
        language: transcription.language || language || "en",
        duration: transcription.duration || 0,
        status: "completed",
        metadata: {
          title: title || `Transcription from ${new Date().toLocaleDateString()}`,
          audioFormat: req.file.mimetype,
          originalFileName: req.file.originalname,
          fileSize: req.file.size,
          processingTime: Date.now() - (req.body.startTime || Date.now()),
          segments: transcription.segments,
          words: transcription.words,
        },
      });
      
      res.json({
        success: true,
        transcription: {
          id: savedTranscription.id,
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          segments: transcription.segments,
        },
      });
    } catch (apiError: any) {
      // Clean up uploaded file on error
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      console.error("OpenAI API error:", apiError);
      const errorResponse = handleOpenAIError(apiError);
      res.status(errorResponse.status).json(errorResponse.body);
    }
  } catch (error: any) {
    console.error("Error processing transcription:", error);
    res.status(500).json({ 
      error: "Failed to process transcription",
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/voice/stream
 * Stream audio transcription in real-time (mock implementation)
 */
router.post("/stream", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { language = "en", title = "" } = req.body;
    
    // Create initial transcription record
    const transcription = await storage.platform.ai.createTranscription(userId, {
      audioUrl: "",
      transcript: "",
      language,
      duration: 0,
      status: "processing",
      metadata: {
        title: title || `Live Transcription from ${new Date().toLocaleDateString()}`,
        processingTime: 0,
        audioFormat: "streaming",
      },
    });
    
    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    
    // Send initial transcription ID
    res.write(`data: ${JSON.stringify({ 
      type: "init", 
      transcriptionId: transcription.id 
    })}\n\n`);
    
    // Mock streaming transcription (in production, this would integrate with real-time Whisper API)
    const mockSegments = [
      "Welcome to the voice transcription service.",
      "This is a demonstration of real-time transcription.",
      "The system can process audio in multiple languages.",
      "Voice commands can be interpreted and executed.",
      "Thank you for using our AI voice services.",
    ];
    
    let fullTranscript = "";
    let currentTime = 0;
    
    for (const segment of mockSegments) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
      
      fullTranscript += (fullTranscript ? " " : "") + segment;
      currentTime += 2;
      
      // Send segment
      res.write(`data: ${JSON.stringify({
        type: "segment",
        text: segment,
        timestamp: currentTime,
        fullTranscript,
      })}\n\n`);
      
      // Update transcription in database
      await storage.platform.ai.updateTranscription(userId, transcription.id, {
        transcript: fullTranscript,
        duration: currentTime,
      });
    }
    
    // Finalize transcription
    await storage.platform.ai.updateTranscription(userId, transcription.id, {
      status: "completed",
    });
    
    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: "complete",
      transcriptionId: transcription.id,
    })}\n\n`);
    
    res.end();
  } catch (error) {
    console.error("Error in streaming transcription:", error);
    res.status(500).json({ error: "Failed to stream transcription" });
  }
});

/**
 * GET /api/ai/voice/transcriptions
 * Get all transcriptions for the authenticated user
 */
router.get("/transcriptions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { page = 1, limit = 10, status } = req.query;
    
    const result = await storage.platform.ai.getTranscriptionsPaginated(
      userId,
      parseInt(page as string),
      parseInt(limit as string),
      status as "processing" | "completed" | "failed" | undefined
    );
    
    res.json(result);
  } catch (error) {
    console.error("Error getting transcriptions:", error);
    res.status(500).json({ error: "Failed to get transcriptions" });
  }
});

/**
 * GET /api/ai/voice/transcriptions/:id
 * Get a specific transcription
 */
router.get("/transcriptions/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const transcription = await storage.platform.ai.getTranscription(userId, req.params.id);
    
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    
    res.json(transcription);
  } catch (error) {
    console.error("Error getting transcription:", error);
    res.status(500).json({ error: "Failed to get transcription" });
  }
});

/**
 * PUT /api/ai/voice/transcriptions/:id/edit
 * Edit and correct a transcription
 */
router.put("/transcriptions/:id/edit", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = editTranscriptSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { editedTranscript, editReason } = validation.data;
    
    // Get original transcription
    const original = await storage.platform.ai.getTranscription(userId, req.params.id);
    if (!original) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    
    // Save edit history
    await storage.platform.ai.createTranscriptionEdit(userId, req.params.id, {
      originalText: original.transcript,
      editedText: editedTranscript,
      editReason: editReason || null,
    });
    
    // Update transcription
    const updated = await storage.platform.ai.updateTranscription(userId, req.params.id, {
      transcript: editedTranscript,
      metadata: {
        ...original.metadata,
        lastEditedAt: new Date().toISOString(),
        editCount: (original.metadata?.editCount || 0) + 1,
      }
    });
    
    res.json({
      success: true,
      transcription: updated,
    });
  } catch (error) {
    console.error("Error editing transcription:", error);
    res.status(500).json({ error: "Failed to edit transcription" });
  }
});

/**
 * GET /api/ai/voice/transcriptions/:id/export
 * Export transcription in various formats
 */
router.get("/transcriptions/:id/export", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const format = exportFormatSchema.parse(req.query.format || 'txt');
    
    const transcription = await storage.platform.ai.getTranscription(userId, req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    
    const formatted = formatTranscript(
      transcription.transcript,
      format,
      transcription.metadata
    );
    
    const mimeTypes = {
      txt: 'text/plain',
      srt: 'application/x-subrip',
      vtt: 'text/vtt',
      json: 'application/json',
    };
    
    res.setHeader('Content-Type', mimeTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="transcription-${req.params.id}.${format}"`);
    res.send(formatted);
  } catch (error) {
    console.error("Error exporting transcription:", error);
    res.status(500).json({ error: "Failed to export transcription" });
  }
});

/**
 * DELETE /api/ai/voice/transcriptions/:id
 * Delete a transcription
 */
router.delete("/transcriptions/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    await storage.platform.ai.deleteTranscription(userId, req.params.id);
    
    res.json({
      success: true,
      message: "Transcription deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transcription:", error);
    res.status(500).json({ error: "Failed to delete transcription" });
  }
});

/**
 * GET /api/ai/voice/transcriptions/search
 * Search transcriptions by text content
 */
router.get("/transcriptions/search", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }
    
    const results = await storage.platform.ai.searchTranscriptions(
      userId, 
      q as string,
      parseInt(limit as string)
    );
    
    res.json(results);
  } catch (error) {
    console.error("Error searching transcriptions:", error);
    res.status(500).json({ error: "Failed to search transcriptions" });
  }
});

// ==================== VOICE COMMAND ENDPOINTS ====================

/**
 * POST /api/ai/voice/commands/process
 * Process a text-based voice command
 */
router.post("/commands/process", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = voiceCommandSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { command, context } = validation.data;
    
    // Interpret the command
    const interpretation = await interpretVoiceCommand(command, context);
    
    // Save command to history
    const commandRecord = await storage.platform.ai.createVoiceCommand(userId, {
      command,
      interpretation,
      processedAt: new Date(),
      success: interpretation.confidence > 0.5,
    });
    
    // Execute the command based on interpretation
    let executionResult = null;
    
    if (interpretation.confidence > 0.5) {
      switch (interpretation.action) {
        case 'add_item':
          // Add item to inventory or shopping list
          if (interpretation.parameters?.items) {
            for (const item of interpretation.parameters.items) {
              await storage.user.inventory.createFoodItem(userId, {
                name: item,
                quantity: interpretation.parameters.quantity || "1",
                storageLocationId: interpretation.parameters.location || "default",
                foodCategory: interpretation.parameters.category || "other",
              });
            }
            executionResult = {
              success: true,
              message: `Added ${interpretation.parameters.items.join(', ')} to inventory`,
            };
          }
          break;
          
        case 'search_recipe':
          // Search for recipes
          const recipes = await storage.user.recipes.searchRecipes(
            userId,
            interpretation.parameters?.query || command
          );
          executionResult = {
            success: true,
            recipes: recipes.slice(0, 3),
          };
          break;
          
        case 'set_timer':
          // Set a cooking timer
          executionResult = {
            success: true,
            message: `Timer set for ${interpretation.parameters?.duration} ${interpretation.parameters?.unit}`,
            timer: {
              duration: interpretation.parameters?.duration,
              unit: interpretation.parameters?.unit,
              label: interpretation.parameters?.label,
            },
          };
          break;
          
        default:
          executionResult = {
            success: false,
            message: "I understood your command but couldn't execute it",
            suggestion: interpretation.alternatives?.[0],
          };
      }
    } else {
      executionResult = {
        success: false,
        message: "I'm not sure what you meant. Could you try rephrasing?",
        alternatives: interpretation.alternatives,
      };
    }
    
    res.json({
      success: true,
      commandId: commandRecord.id,
      interpretation,
      result: executionResult,
    });
  } catch (error) {
    console.error("Error processing voice command:", error);
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * GET /api/ai/voice/commands
 * Get available voice commands
 */
router.get("/commands", async (req: Request, res: Response) => {
  res.json({
    success: true,
    commands: [
      {
        category: "Inventory",
        examples: [
          "Add milk to my shopping list",
          "I bought eggs and bread",
          "What's in my fridge?",
          "Remove expired items",
        ],
      },
      {
        category: "Recipes",
        examples: [
          "Find recipes with chicken",
          "Show me vegetarian dinner ideas",
          "What can I make with pasta and tomatoes?",
          "Save this recipe",
        ],
      },
      {
        category: "Cooking",
        examples: [
          "Set a timer for 10 minutes",
          "Convert 2 cups to milliliters",
          "What temperature for roasting chicken?",
          "How long to boil eggs?",
        ],
      },
      {
        category: "Meal Planning",
        examples: [
          "Plan meals for this week",
          "Add pasta night to Thursday",
          "Generate shopping list for meal plan",
          "What's for dinner tonight?",
        ],
      },
    ],
  });
});

/**
 * GET /api/ai/voice/commands/history
 * Get user's voice command history
 */
router.get("/commands/history", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { limit = 20 } = req.query;
    
    const history = await storage.platform.ai.getVoiceCommandHistory(
      userId,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Error getting command history:", error);
    res.status(500).json({ error: "Failed to get command history" });
  }
});

/**
 * GET /api/ai/voice/stats
 * Get voice service usage statistics
 */
router.get("/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Get usage stats
    const transcriptionCount = await storage.platform.ai.getTranscriptionCount(userId);
    const commandCount = await storage.platform.ai.getVoiceCommandCount(userId);
    
    res.json({
      success: true,
      stats: {
        transcriptions: transcriptionCount,
        voiceCommands: commandCount,
        totalDuration: 0, // Would calculate from transcriptions
      },
      endpoints: {
        transcription: "/api/ai/voice/transcribe",
        streaming: "/api/ai/voice/stream",
        commands: "/api/ai/voice/commands/*",
      },
      metadata: {
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting voice stats:", error);
    res.status(500).json({
      error: "Failed to get voice statistics",
    });
  }
});

export default router;