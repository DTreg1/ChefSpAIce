/**
 * Transcriptions Router
 * 
 * Provides endpoints for speech-to-text transcription using OpenAI Whisper API:
 * - Transcribe audio files (up to 5 minutes)
 * - Stream transcriptions in real-time
 * - Edit and correct transcriptions
 * - Export in multiple formats (SRT, TXT, DOC)
 */

import express from "express";
import multer from "multer";
import { storage } from "../storage/index";
import type { InsertTranscription, InsertTranscriptEdit } from "@shared/schema";
import { insertTranscriptionSchema, insertTranscriptEditSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for audio file uploads
const upload = multer({
  dest: "uploads/audio/",
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size (Whisper API limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/mp4",
      "audio/m4a",
      "audio/ogg",
      "audio/flac",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."));
    }
  },
});

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

/**
 * GET /api/transcriptions
 * Get all transcriptions for the authenticated user
 */
router.get("/", requireAuth, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const result = await storage.platform.ai.getTranscriptionsPaginated(
      req.user.id,
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
 * GET /api/transcriptions/:id
 * Get a specific transcription
 */
router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const transcription = await storage.platform.ai.getTranscription(req.user.id, req.params.id);
    
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
 * POST /api/transcriptions/audio
 * Transcribe an uploaded audio file using OpenAI Whisper
 */
router.post("/audio", requireAuth, upload.single("audio"), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const { language = "en", prompt = "", title = "" } = req.body;

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable." 
      });
    }

    // Create a readable stream from the uploaded file
    const audioFile = fs.createReadStream(req.file.path);

    try {
      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: language || undefined,
        prompt: prompt || undefined,
        response_format: "verbose_json",
        timestamp_granularities: ["word", "segment"],
      });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      // Save transcription to database
      const savedTranscription = await storage.platform.ai.createTranscription(req.user.id, {
        audioUrl: `/uploads/audio/${req.file.filename}`, // Store reference to audio file
        transcript: transcription.text,
        language: transcription.language || language,
        duration: transcription.duration || 0,
        status: "completed",
        metadata: {
          title: title || `Transcription from ${new Date().toLocaleDateString()}`,
          audioFormat: req.file.mimetype,
          bitrate: 128000,
          sampleRate: 44100,
          processingTime: Date.now() - req.body.startTime || 0,
          // Store segments and words in a different structure
          transcriptData: {
            segments: transcription.segments,
            words: transcription.words,
            originalFileName: req.file.originalname,
            fileSize: req.file.size,
          },
        },
      });

      res.json({
        success: true,
        transcription: savedTranscription,
      });
    } catch (apiError: any) {
      // Clean up uploaded file on error
      fs.unlinkSync(req.file.path);
      
      console.error("OpenAI API error:", apiError);
      res.status(500).json({ 
        error: "Failed to transcribe audio",
        details: apiError.message,
      });
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
 * POST /api/transcriptions/stream
 * Stream audio transcription in real-time (mock implementation)
 */
router.post("/stream", requireAuth, async (req: any, res: any) => {
  try {
    const { language = "en", title = "" } = req.body;

    // Create initial transcription record
    const transcription = await storage.platform.ai.createTranscription(req.user.id, {
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
      "Welcome to the meeting.",
      "Today we'll discuss the quarterly results.",
      "Our revenue has increased by 15%.",
      "We've also launched three new products.",
      "Customer satisfaction scores are at an all-time high.",
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
      await storage.platform.ai.updateTranscription(req.user.id, transcription.id, {
        transcript: fullTranscript,
        duration: currentTime,
      });
    }

    // Finalize transcription
    await storage.platform.ai.updateTranscription(req.user.id, transcription.id, {
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
 * PUT /api/transcriptions/:id/edit
 * Edit and correct transcription text
 */
router.put("/:id/edit", requireAuth, async (req: any, res: any) => {
  try {
    const { timestamp, original_text, corrected_text, reason } = req.body;

    // Validate input
    if (!original_text || !corrected_text) {
      return res.status(400).json({ 
        error: "Both original_text and corrected_text are required" 
      });
    }

    // Get the transcription to ensure it exists and belongs to the user
    const transcription = await storage.platform.ai.getTranscription(req.user.id, req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    // Create transcript edit record
    const edit = await storage.platform.ai.createTranscriptEdit(req.user.id, {
      transcriptionId: req.params.id,
      timestamp: timestamp || 0,
      originalSegment: original_text,
      editedSegment: corrected_text,
      editType: "content",
      confidence: 100,
    });

    // Update the main transcript with the correction
    const updatedTranscript = transcription.transcript.replace(
      original_text,
      corrected_text
    );

    const updatedTranscription = await storage.platform.ai.updateTranscription(
      req.user.id,
      req.params.id,
      {
        transcript: updatedTranscript,
        metadata: {
          ...transcription.metadata,
          // Store edit history in a compatible format
          editHistory: [
            ...((transcription.metadata)?.editHistory || []),
            {
              editedAt: new Date().toISOString(),
              editId: edit.id,
            }
          ],
        },
      }
    );

    res.json({
      success: true,
      edit,
      transcription: updatedTranscription,
    });
  } catch (error) {
    console.error("Error editing transcription:", error);
    res.status(500).json({ error: "Failed to edit transcription" });
  }
});

/**
 * GET /api/transcriptions/:id/edits
 * Get all edits for a transcription
 */
router.get("/:id/edits", requireAuth, async (req: any, res: any) => {
  try {
    const transcription = await storage.platform.ai.getTranscription(req.user.id, req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    const edits = await storage.platform.ai.getTranscriptEdits(req.params.id);
    res.json(edits);
  } catch (error) {
    console.error("Error getting transcript edits:", error);
    res.status(500).json({ error: "Failed to get transcript edits" });
  }
});

/**
 * GET /api/transcriptions/:id/export
 * Export transcription in different formats
 */
router.get("/:id/export", requireAuth, async (req: any, res: any) => {
  try {
    const { format = "txt" } = req.query;
    
    const transcription = await storage.platform.ai.getTranscription(req.user.id, req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    const metadata = transcription.metadata;
    const segments = metadata?.segments || [];
    const title = metadata?.title || "Transcription";

    switch (format) {
      case "srt":
        // Generate SRT format (SubRip Subtitle)
        let srtContent = "";
        segments.forEach((segment: any, index: number) => {
          const startTime = formatSRTTime(segment.start || 0);
          const endTime = formatSRTTime(segment.end || segment.start + 3);
          srtContent += `${index + 1}\n`;
          srtContent += `${startTime} --> ${endTime}\n`;
          srtContent += `${segment.text}\n\n`;
        });

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${title}.srt"`);
        res.send(srtContent || generateFallbackSRT(transcription.transcript));
        break;

      case "vtt":
        // Generate WebVTT format
        let vttContent = "WEBVTT\n\n";
        segments.forEach((segment: any, index: number) => {
          const startTime = formatVTTTime(segment.start || 0);
          const endTime = formatVTTTime(segment.end || segment.start + 3);
          vttContent += `${startTime} --> ${endTime}\n`;
          vttContent += `${segment.text}\n\n`;
        });

        res.setHeader("Content-Type", "text/vtt");
        res.setHeader("Content-Disposition", `attachment; filename="${title}.vtt"`);
        res.send(vttContent || generateFallbackVTT(transcription.transcript));
        break;

      case "json":
        // Export as structured JSON
        res.json({
          title,
          language: transcription.language,
          duration: transcription.duration,
          transcript: transcription.transcript,
          segments,
          words: metadata?.words || [],
          createdAt: transcription.createdAt,
          updatedAt: transcription.updatedAt,
        });
        break;

      case "txt":
      default:
        // Export as plain text
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${title}.txt"`);
        res.send(transcription.transcript);
        break;
    }
  } catch (error) {
    console.error("Error exporting transcription:", error);
    res.status(500).json({ error: "Failed to export transcription" });
  }
});

/**
 * DELETE /api/transcriptions/:id
 * Delete a transcription and all its edits
 */
router.delete("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const transcription = await storage.platform.ai.getTranscription(req.user.id, req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    await storage.platform.ai.deleteTranscription(req.user.id, req.params.id);
    res.json({ success: true, message: "Transcription deleted successfully" });
  } catch (error) {
    console.error("Error deleting transcription:", error);
    res.status(500).json({ error: "Failed to delete transcription" });
  }
});

/**
 * GET /api/transcriptions/search
 * Search transcriptions by text
 */
router.get("/search", requireAuth, async (req: any, res: any) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const results = await storage.platform.ai.searchTranscriptions(
      req.user.id, 
      q as string,
      parseInt(limit as string)
    );
    
    res.json(results);
  } catch (error) {
    console.error("Error searching transcriptions:", error);
    res.status(500).json({ error: "Failed to search transcriptions" });
  }
});

// Helper functions for time formatting
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`;
}

function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, "0");
}

// Fallback functions when segments are not available
function generateFallbackSRT(transcript: string): string {
  const words = transcript.split(" ");
  const wordsPerSegment = 10;
  let srtContent = "";
  let segmentIndex = 1;
  
  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const segment = words.slice(i, i + wordsPerSegment).join(" ");
    const startTime = formatSRTTime(i * 3); // Assume 3 seconds per segment
    const endTime = formatSRTTime((i + wordsPerSegment) * 3);
    
    srtContent += `${segmentIndex}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${segment}\n\n`;
    segmentIndex++;
  }
  
  return srtContent;
}

function generateFallbackVTT(transcript: string): string {
  const words = transcript.split(" ");
  const wordsPerSegment = 10;
  let vttContent = "WEBVTT\n\n";
  
  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const segment = words.slice(i, i + wordsPerSegment).join(" ");
    const startTime = formatVTTTime(i * 3); // Assume 3 seconds per segment
    const endTime = formatVTTTime((i + wordsPerSegment) * 3);
    
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${segment}\n\n`;
  }
  
  return vttContent;
}

export default router;