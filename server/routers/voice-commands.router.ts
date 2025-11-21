/**
 * Voice Commands Router (Task 8)
 * 
 * Handles voice command transcription and processing.
 * Works with Web Speech API on frontend, processes with Whisper API.
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "../middleware";
import { aiMlStorage, inventoryStorage } from "../storage/index";
import OpenAI from "openai";
import { z } from "zod";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { getOpenAIClient } from "../config/openai-config";
import { getSafeEnvVar } from "../config/env-validator";

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "tmp", "voice-uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept common audio formats
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/mp4'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Initialize OpenAI clients
// Use standard OpenAI for Whisper (requires API key)
const whisperApiKey = getSafeEnvVar('OPENAI_API_KEY');
const whisperClient = whisperApiKey ? new OpenAI({ apiKey: whisperApiKey }) : null;

// Use AI Integrations for chat completions
const openai = getOpenAIClient();

/**
 * GET /api/voice/commands
 * Get available voice commands
 */
router.get("/commands", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const commands = await aiMlStorage.getAvailableVoiceCommands();
    res.json(commands);
  } catch (error) {
    console.error("Error fetching voice commands:", error);
    res.status(500).json({ error: "Failed to fetch voice commands" });
  }
});

/**
 * GET /api/voice/history
 * Get user's voice command history
 */
router.get("/history", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await aiMlStorage.getVoiceCommands(userId, limit);
    res.json(history);
  } catch (error) {
    console.error("Error fetching voice history:", error);
    res.status(500).json({ error: "Failed to fetch voice history" });
  }
});

/**
 * POST /api/voice/process-text
 * Process text-based voice command (when using Web Speech API)
 */
router.post("/process-text", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    // Process the command
    const processedCommand = await processVoiceCommand(text, userId);
    
    // Save to history
    const command = await aiMlStorage.createVoiceCommand({
      userId,
      transcript: text,
      commandType: processedCommand.command,
      actionTaken: processedCommand.actionTaken,
      success: processedCommand.success
    });
    
    res.json({
      command,
      processedCommand
    });
  } catch (error) {
    console.error("Error processing voice command:", error);
    res.status(500).json({ error: "Failed to process voice command" });
  }
});

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using OpenAI Whisper
 */
router.post("/transcribe", isAuthenticated, upload.single("audio"), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }
    
    // Check if we have Whisper client available
    if (!whisperClient) {
      // Fall back to returning a message to use Web Speech API
      return res.status(501).json({ 
        error: "Audio transcription requires OpenAI API key. Please use Web Speech API fallback.",
        useWebSpeech: true 
      });
    }
    
    try {
      // Read the audio file
      const audioFile = await fs.readFile(req.file.path);
      
      // Create a File object for the API
      const file = new File([audioFile], req.file.filename, { type: req.file.mimetype });
      
      // Transcribe using Whisper
      const transcription = await whisperClient.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "en", // You can make this configurable
        response_format: "json"
      });
      
      // Clean up the uploaded file
      await fs.unlink(req.file.path);
      
      res.json({
        transcript: transcription.text,
        success: true
      });
    } catch (transcriptionError) {
      console.error("Whisper transcription error:", transcriptionError);
      // Clean up the file on error
      if (req.file.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ 
        error: "Failed to transcribe audio",
        details: transcriptionError instanceof Error ? transcriptionError.message : "Unknown error"
      });
    }
  } catch (error) {
    console.error("Error in transcribe endpoint:", error);
    res.status(500).json({ error: "Failed to process audio file" });
  }
});

/**
 * POST /api/voice/interpret
 * Interpret and execute a voice command
 */
router.post("/interpret", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { transcript } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required" });
    }
    
    // Process the command
    const processedCommand = await processVoiceCommand(transcript, userId);
    
    // Save to history
    const command = await aiMlStorage.createVoiceCommand({
      userId,
      transcript: transcript,
      commandType: processedCommand.command,
      actionTaken: processedCommand.actionTaken,
      success: processedCommand.success
    });
    
    res.json({
      command,
      interpretation: processedCommand,
      response: processedCommand.response
    });
  } catch (error) {
    console.error("Error interpreting voice command:", error);
    res.status(500).json({ error: "Failed to interpret voice command" });
  }
});

/**
 * Helper function to process voice commands using AI
 */
async function processVoiceCommand(text: string, userId: string): Promise<{
  command: string;
  parameters: any;
  actionTaken: string;
  success: boolean;
  response?: string;
  navigationPath?: string;
}> {
  try {
    // Use GPT to understand the command intent
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        {
          role: "system",
          content: `You are a voice command processor for a food management app. 
          Extract the command intent and parameters from user input.
          
          Available commands:
          - navigate: Navigate to a page (parameters: page, route, filters)
          - search: Search for items (parameters: query, type, filters)
          - add: Add items to lists (parameters: item, list, quantity)
          - show: Display information (parameters: what, filters, timeframe)
          - create: Create new items (parameters: type, details)
          - filter: Apply filters (parameters: filterType, value)
          
          Pages in the app:
          - home: Dashboard
          - inventory: Food inventory
          - recipes: Recipe collection
          - orders: Order history (also accepts "recent orders", "my orders")
          - shopping: Shopping list
          - meal-plans: Meal planning
          - settings: User settings
          - profile: User profile
          
          Response in JSON format:
          {
            "command": "command_name",
            "parameters": { ... },
            "route": "/path/to/page",
            "naturalResponse": "What the assistant should say"
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    
    // Process the command based on type
    let actionTaken = "";
    let success = true;
    let navigationPath = result.route;
    
    switch (result.command) {
      case "navigate":
      case "show":
        // Handle navigation and show commands
        if (text.toLowerCase().includes("recent orders") || text.toLowerCase().includes("my orders")) {
          navigationPath = "/orders";
          result.parameters.filter = "recent";
          actionTaken = `Showing your recent orders`;
        } else if (text.toLowerCase().includes("expiring")) {
          navigationPath = "/inventory";
          result.parameters.filter = "expiring";
          actionTaken = `Showing expiring items`;
        } else if (result.parameters.page) {
          const pageMap: Record<string, string> = {
            'home': '/',
            'inventory': '/inventory',
            'recipes': '/recipes',
            'orders': '/orders',
            'shopping': '/shopping-list',
            'meal-plans': '/meal-plans',
            'settings': '/settings',
            'profile': '/profile'
          };
          navigationPath = pageMap[result.parameters.page] || '/';
          actionTaken = `Navigate to ${result.parameters.page}`;
        } else {
          actionTaken = `Show ${result.parameters.what || 'information'}`;
        }
        break;
        
      case "search":
        navigationPath = result.parameters.type === 'recipe' ? '/recipes' : '/inventory';
        result.parameters.searchQuery = result.parameters.query;
        actionTaken = `Search for ${result.parameters.query}`;
        break;
        
      case "add":
        actionTaken = `Add ${result.parameters.quantity || 1} ${result.parameters.item} to ${result.parameters.list}`;
        if (result.parameters.list === "shopping" || result.parameters.list === "shopping list") {
          await inventoryStorage.createShoppingItem({
            userId,
            name: result.parameters.item,
            quantity: (result.parameters.quantity || 1).toString(),
            isPurchased: false
          });
        } else if (result.parameters.list === "inventory") {
          await aiMlStorage.createFoodItem(userId, {
            name: result.parameters.item,
            quantity: (result.parameters.quantity || 1).toString(),
            unit: "units",
            storageLocationId: "default",
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
        break;
        
      case "create":
        if (result.parameters.type === "meal plan") {
          navigationPath = "/meal-plans";
        } else if (result.parameters.type === "recipe") {
          navigationPath = "/recipes/new";
        }
        actionTaken = `Create ${result.parameters.type}`;
        break;
        
      default:
        actionTaken = "Command not recognized";
        success = false;
    }
    
    return {
      command: result.command || "unknown",
      parameters: result.parameters || {},
      actionTaken,
      success,
      response: result.naturalResponse,
      navigationPath
    };
  } catch (error) {
    console.error("Error processing command with AI:", error);
    return {
      command: "error",
      parameters: {},
      actionTaken: "Error processing command",
      success: false
    };
  }
}

/**
 * GET /api/voice/stats
 * Get voice command usage statistics
 */
router.get("/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const commands = await aiMlStorage.getVoiceCommands(userId, 100);
    
    // Calculate stats
    const stats = {
      totalCommands: commands.length,
      successRate: commands.filter(c => c.success).length / (commands.length || 1),
      commandBreakdown: {} as Record<string, number>,
      recentCommands: commands.slice(0, 5)
    };
    
    // Count command types
    commands.forEach(cmd => {
      const commandKey = cmd.commandType || 'unknown';
      stats.commandBreakdown[commandKey] = (stats.commandBreakdown[commandKey] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching voice stats:", error);
    res.status(500).json({ error: "Failed to fetch voice stats" });
  }
});

export default router;