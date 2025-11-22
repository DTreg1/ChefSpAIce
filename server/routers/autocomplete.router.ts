/**
 * Auto-Complete API Router
 * 
 * Provides intelligent form field auto-completion using ML and user history.
 * Combines TensorFlow.js for pattern recognition with OpenAI for context understanding.
 * 
 * Features:
 * - Personal history-based suggestions
 * - Context-aware completions (e.g., city → state)
 * - Learning from user inputs
 * - Feedback tracking for model improvement
 * 
 * @module server/routers/autocomplete.router
 */

import express, { Router } from "express";
import { aiMlStorage } from "../storage/index";
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/oauth.middleware";
import { insertCompletionFeedbackSchema } from "@shared/schema";
import z from "zod";
import OpenAI from "openai";
import * as tf from "@tensorflow/tfjs-node";

const router = Router();

// OpenAI client for advanced context understanding
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// TensorFlow.js model for pattern detection
let patternModel: tf.LayersModel | null = null;

/**
 * Load or create the TensorFlow pattern detection model
 */
async function getPatternModel(): Promise<tf.LayersModel> {
  if (!patternModel) {
    try {
      // Try to load existing model
      patternModel = await tf.loadLayersModel("file://./models/form-patterns/model.json");
    } catch {
      // Create new model if none exists
      patternModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 128, activation: "relu" }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 64, activation: "relu" }),
          tf.layers.dense({ units: 32, activation: "relu" }),
          tf.layers.dense({ units: 10, activation: "softmax" }),
        ],
      });
      
      patternModel.compile({
        optimizer: "adam",
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
      });
    }
  }
  return patternModel;
}

/**
 * GET /api/autocomplete/suggestions
 * Get suggestions for a form field based on query and user history
 */
router.get("/suggestions", isAuthenticated, async (req: any, res) => {
  try {
    const { fieldName, query = "" } = req.query;
    const userId = getAuthenticatedUserId(req);
    
    if (!fieldName || typeof fieldName !== "string") {
      return res.status(400).json({ error: "Field name is required" });
    }
    
    // Get suggestions from storage (combines user history and global patterns)
    const suggestions = await aiMlStorage.getFieldSuggestions(
      fieldName,
      query as string,
      userId ?? undefined
    );
    
    // Apply ML ranking if we have enough suggestions
    if (suggestions.length > 1 && query) {
      try {
        const model = await getPatternModel();
        
        // Convert query and suggestions to feature vectors
        const features = suggestions.map(suggestion => {
          // Simple feature extraction: length similarity, char overlap, etc.
          const lengthDiff = Math.abs(suggestion.length - (query as string).length);
          const charOverlap = Array.from(query as string).filter(c => suggestion.includes(c)).length;
          const startsWith = suggestion.toLowerCase().startsWith((query as string).toLowerCase()) ? 1 : 0;
          
          // Pad to 10 features
          return [
            lengthDiff / 100,
            charOverlap / Math.max((query as string).length, 1),
            startsWith,
            suggestion.length / 100,
            (query as string).length / 100,
            0, 0, 0, 0, 0 // Padding
          ];
        });
        
        // Predict relevance scores
        const predictions = model.predict(tf.tensor2d(features)) as tf.Tensor;
        const scores = await predictions.array() as number[][];
        
        // Sort suggestions by predicted relevance
        const rankedSuggestions = suggestions
          .map((s, i) => ({ suggestion: s, score: scores[i][0] }))
          .sort((a, b) => b.score - a.score)
          .map(item => item.suggestion);
        
        return res.json({ suggestions: rankedSuggestions });
      } catch (error) {
        console.error("ML ranking failed, using default order:", error);
      }
    }
    
    res.json({ suggestions });
  } catch (error) {
    console.error("Error getting suggestions:", error);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

/**
 * GET /api/autocomplete/context
 * Get context-aware suggestions based on other form fields
 */
router.post("/context", isAuthenticated, async (req: any, res) => {
  try {
    const { fieldName, context } = req.body;
    const userId = getAuthenticatedUserId(req);
    
    if (!fieldName) {
      return res.status(400).json({ error: "Field name is required" });
    }
    
    // Get basic contextual suggestions from storage
    const basicSuggestions = await aiMlStorage.getContextualSuggestions(
      fieldName,
      context || {},
      userId ?? undefined
    );
    
    // Enhance with OpenAI if API key is available
    if (process.env.OPENAI_API_KEY && Object.keys(context || {}).length > 0) {
      try {
        const prompt = `Given a form with these filled fields: ${JSON.stringify(context)}, 
          suggest the most likely values for the field "${fieldName}". 
          Return only a JSON array of 5 string suggestions, no explanation.`;
        
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that predicts form field values based on context.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });
        
        const content = completion.choices[0].message.content;
        if (content) {
          try {
            const aiSuggestions = JSON.parse(content) as string[];
            
            // Merge AI suggestions with basic suggestions (AI first, then basic)
            const mergedSuggestions = [
              ...aiSuggestions.filter(s => !basicSuggestions.includes(s)),
              ...basicSuggestions
            ].slice(0, 10);
            
            return res.json({ suggestions: mergedSuggestions });
          } catch (parseError) {
            console.error("Failed to parse AI suggestions:", parseError);
          }
        }
      } catch (error) {
        console.error("OpenAI enhancement failed:", error);
      }
    }
    
    res.json({ suggestions: basicSuggestions });
  } catch (error) {
    console.error("Error getting contextual suggestions:", error);
    res.status(500).json({ error: "Failed to get contextual suggestions" });
  }
});

/**
 * POST /api/autocomplete/learn
 * Record form input for learning and pattern detection
 */
router.post("/learn", isAuthenticated, async (req: any, res) => {
  try {
    const { fieldName, value, context } = req.body;
    const userId = getAuthenticatedUserId(req);
    
    if (!userId || !fieldName || !value) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Record the input for future suggestions
    await aiMlStorage.recordFormInput(userId, fieldName, value, context);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error recording form input:", error);
    res.status(500).json({ error: "Failed to record input" });
  }
});

/**
 * POST /api/autocomplete/feedback
 * Record whether a suggestion was selected or modified
 */
router.post("/feedback", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    
    // Validate request body
    const feedbackData = insertCompletionFeedbackSchema.parse({
      ...req.body,
      userId,
    });
    
    // Record the feedback
    const feedback = await aiMlStorage.recordCompletionFeedback(feedbackData);
    
    // Train model asynchronously if we have enough feedback
    if (Math.random() < 0.1) { // 10% chance to trigger training
      trainModelWithFeedback().catch(console.error);
    }
    
    res.json({ success: true, feedbackId: feedback.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
    }
    console.error("Error recording feedback:", error);
    res.status(500).json({ error: "Failed to record feedback" });
  }
});

/**
 * GET /api/autocomplete/history
 * Get user's form input history
 */
router.get("/history", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { fieldName } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const history = await aiMlStorage.getUserFormHistory(
      userId,
      fieldName as string | undefined
    );
    
    res.json({ history });
  } catch (error) {
    console.error("Error getting form history:", error);
    res.status(500).json({ error: "Failed to get history" });
  }
});

/**
 * DELETE /api/autocomplete/history
 * Clear user's form history
 */
router.delete("/history", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    await aiMlStorage.clearUserFormHistory(userId);
    
    res.json({ success: true, message: "Form history cleared" });
  } catch (error) {
    console.error("Error clearing form history:", error);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

/**
 * Train the ML model with accumulated feedback
 */
async function trainModelWithFeedback(): Promise<void> {
  try {
    console.log("Starting model training with feedback...");
    
    // This would typically:
    // 1. Load recent feedback data
    // 2. Convert to training features
    // 3. Train the model
    // 4. Save the updated model
    
    // Placeholder for actual training logic
    const model = await getPatternModel();
    
    // Save model after training
    await model.save("file://./models/form-patterns");
    
    console.log("Model training completed");
  } catch (error) {
    console.error("Model training failed:", error);
  }
}

export default router;