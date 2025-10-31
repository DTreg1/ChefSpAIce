/**
 * Voice Commands Router (Task 8)
 * 
 * Handles voice command transcription and processing.
 * Works with Web Speech API on frontend, processes with Whisper API.
 */

import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage";
import OpenAI from "openai";
import { z } from "zod";

const router = Router();

// Initialize OpenAI client for Whisper API access
// Referenced from blueprint:javascript_openai_ai_integrations
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "not-needed"
});

/**
 * GET /api/voice/commands
 * Get available voice commands
 */
router.get("/commands", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const commands = await storage.getAvailableVoiceCommands();
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
router.get("/history", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await storage.getVoiceCommands(userId, limit);
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
router.post("/process-text", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    // Process the command
    const processedCommand = await processVoiceCommand(text, userId);
    
    // Save to history
    const command = await storage.createVoiceCommand({
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
 * POST /api/voice/process-audio
 * Process audio-based voice command (future implementation with audio transcription)
 * Note: Audio transcription is not supported by the AI gateway, this is a placeholder
 */
router.post("/process-audio", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    // Note: Audio processing would require alternative solution as 
    // the AI gateway doesn't support audio inputs
    return res.status(501).json({ 
      error: "Audio processing not yet implemented. Please use text-based commands via Web Speech API." 
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    res.status(500).json({ error: "Failed to process audio" });
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
}> {
  try {
    // Use GPT to understand the command intent
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4o-mini for efficient voice command processing
      messages: [
        {
          role: "system",
          content: `You are a voice command processor for a food management app. 
          Extract the command intent and parameters from user input.
          
          Available commands:
          - navigate: Navigate to a page (parameters: page)
          - search: Search for items (parameters: query, type)
          - add: Add items to lists (parameters: item, list, quantity)
          - show: Display information (parameters: what)
          - create: Create new items (parameters: type, details)
          
          Response in JSON format:
          {
            "command": "command_name",
            "parameters": { ... },
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
    
    switch (result.command) {
      case "navigate":
        actionTaken = `Navigate to ${result.parameters.page}`;
        break;
      case "search":
        actionTaken = `Search for ${result.parameters.query}`;
        break;
      case "add":
        actionTaken = `Add ${result.parameters.quantity || 1} ${result.parameters.item} to ${result.parameters.list}`;
        // Here you would actually add the item to the database
        if (result.parameters.list === "shopping" || result.parameters.list === "shopping list") {
          // Add to shopping list
          await storage.createActivityLog({
            userId,
            action: "voice_add_to_shopping_list",
            entity: "shopping_list",
            entityId: "",
            metadata: result.parameters
          });
        }
        break;
      case "show":
        actionTaken = `Show ${result.parameters.what}`;
        break;
      case "create":
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
      response: result.naturalResponse
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
router.get("/stats", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const commands = await storage.getVoiceCommands(userId, 100);
    
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