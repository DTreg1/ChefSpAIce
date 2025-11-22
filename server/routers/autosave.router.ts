/**
 * Auto-Save Router
 * 
 * Handles intelligent auto-save operations with draft versioning
 * and typing pattern learning for personalized save timing.
 */

import { Router } from "express";
import { aiMlStorage } from "../storage/index";
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/oauth.middleware";
import { insertAutoSaveDraftSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// POST /api/autosave/draft - Save draft version
router.post("/draft", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate request body
    const draftSchema = insertAutoSaveDraftSchema.extend({
      documentId: z.string().min(1),
      documentType: z.enum(["chat", "recipe", "note", "meal_plan", "shopping_list", "other"]).optional(),
      content: z.string(),
      metadata: z.object({
        cursorPosition: z.number().optional(),
        scrollPosition: z.number().optional(),
        selectedText: z.string().optional(),
        editorState: z.any().optional(),
        deviceInfo: z.object({
          browser: z.string().optional(),
          os: z.string().optional(),
          screenSize: z.string().optional(),
        }).optional(),
      }).optional(),
      isAutoSave: z.boolean().optional(),
    });

    const validatedData = draftSchema.parse(req.body);
    
    // Save the draft
    const savedDraft = await aiMlStorage.saveDraft({
      ...validatedData,
      userId,
    });

    // Record typing event if provided
    if (req.body.typingEvent) {
      await aiMlStorage.recordTypingEvent(userId, req.body.typingEvent);
    }

    res.json({
      success: true,
      draft: savedDraft,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid draft data",
        errors: error.errors,
      });
    }
    console.error("Error saving draft:", error);
    res.status(500).json({
      message: "Failed to save draft",
    });
  }
});

// GET /api/autosave/restore - Get latest draft
router.get("/restore", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { documentId } = req.query;
    if (!documentId || typeof documentId !== "string") {
      return res.status(400).json({
        message: "Document ID is required",
      });
    }

    const draft = await aiMlStorage.getLatestDraft(userId, documentId);
    
    if (!draft) {
      return res.status(404).json({
        message: "No draft found for this document",
      });
    }

    res.json({
      success: true,
      draft,
    });
  } catch (error) {
    console.error("Error restoring draft:", error);
    res.status(500).json({
      message: "Failed to restore draft",
    });
  }
});

// GET /api/autosave/versions - List draft versions
router.get("/versions", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { documentId, limit } = req.query;
    if (!documentId || typeof documentId !== "string") {
      return res.status(400).json({
        message: "Document ID is required",
      });
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const versions = await aiMlStorage.getDraftVersions(userId, documentId, limitNum);

    res.json({
      success: true,
      versions,
      count: versions.length,
    });
  } catch (error) {
    console.error("Error getting draft versions:", error);
    res.status(500).json({
      message: "Failed to get draft versions",
    });
  }
});

// DELETE /api/autosave/draft/:id - Delete specific draft
router.delete("/draft/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Draft ID is required",
      });
    }

    await aiMlStorage.deleteDraft(userId, id);

    res.json({
      success: true,
      message: "Draft deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting draft:", error);
    res.status(500).json({
      message: "Failed to delete draft",
    });
  }
});

// DELETE /api/autosave/document/:documentId - Delete all drafts for a document
router.delete("/document/:documentId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { documentId } = req.params;
    if (!documentId) {
      return res.status(400).json({
        message: "Document ID is required",
      });
    }

    await aiMlStorage.deleteDocumentDrafts(userId, documentId);

    res.json({
      success: true,
      message: "All drafts for document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document drafts:", error);
    res.status(500).json({
      message: "Failed to delete document drafts",
    });
  }
});

// POST /api/autosave/cleanup - Clean up old drafts
router.post("/cleanup", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const deletedCount = await aiMlStorage.cleanupOldDrafts(userId);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old drafts`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error cleaning up drafts:", error);
    res.status(500).json({
      message: "Failed to clean up old drafts",
    });
  }
});

// GET /api/autosave/patterns - Get user typing patterns
router.get("/patterns", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const patterns = await aiMlStorage.getUserSavePatterns(userId);

    res.json({
      success: true,
      patterns,
    });
  } catch (error) {
    console.error("Error getting typing patterns:", error);
    res.status(500).json({
      message: "Failed to get typing patterns",
    });
  }
});

// PUT /api/autosave/patterns - Update typing patterns
router.put("/patterns", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updatedPatterns = await aiMlStorage.updateUserSavePatterns(userId, req.body);

    res.json({
      success: true,
      patterns: updatedPatterns,
    });
  } catch (error) {
    console.error("Error updating typing patterns:", error);
    res.status(500).json({
      message: "Failed to update typing patterns",
    });
  }
});

// POST /api/autosave/typing-event - Record typing event
router.post("/typing-event", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const eventSchema = z.object({
      pauseDuration: z.number().optional(),
      burstLength: z.number().optional(),
      keyInterval: z.number().optional(),
      isSentenceEnd: z.boolean().optional(),
      isParagraphEnd: z.boolean().optional(),
      wasManualSave: z.boolean().optional(),
    });

    const validatedEvent = eventSchema.parse(req.body);
    await aiMlStorage.recordTypingEvent(userId, validatedEvent);

    res.json({
      success: true,
      message: "Typing event recorded",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid typing event data",
        errors: error.errors,
      });
    }
    console.error("Error recording typing event:", error);
    res.status(500).json({
      message: "Failed to record typing event",
    });
  }
});

// POST /api/autosave/check-conflicts - Check for conflicting edits
router.post("/check-conflicts", isAuthenticated, async (req: any, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { documentId, contentHash } = req.body;
    if (!documentId || !contentHash) {
      return res.status(400).json({
        message: "Document ID and content hash are required",
      });
    }

    const conflictCheck = await aiMlStorage.checkForConflicts(userId, documentId, contentHash);

    res.json({
      success: true,
      ...conflictCheck,
    });
  } catch (error) {
    console.error("Error checking for conflicts:", error);
    res.status(500).json({
      message: "Failed to check for conflicts",
    });
  }
});

export default router;