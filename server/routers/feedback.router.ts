import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { feedback, userSessions, insertFeedbackSchema } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

const feedbackRequestSchema = z.object({
  type: z.enum(["feedback", "bug"]),
  category: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  userEmail: z.string().email().optional().nullable(),
  deviceInfo: z.string().optional(),
  screenContext: z.string().optional(),
  stepsToReproduce: z.string().optional(),
  severity: z.enum(["minor", "major", "critical"]).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = feedbackRequestSchema.parse(req.body);
    
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const sessions = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.token, token));
      
      if (sessions.length > 0 && new Date(sessions[0].expiresAt) > new Date()) {
        userId = sessions[0].userId;
      }
    }

    const feedbackEntry = await db
      .insert(feedback)
      .values({
        userId,
        type: validatedData.type,
        category: validatedData.category || null,
        message: validatedData.message,
        userEmail: validatedData.userEmail || null,
        deviceInfo: validatedData.deviceInfo || null,
        screenContext: validatedData.screenContext || null,
        stepsToReproduce: validatedData.stepsToReproduce || null,
        severity: validatedData.severity || null,
        status: "new",
      })
      .returning();

    console.log(`[Feedback] New ${validatedData.type} submitted:`, feedbackEntry[0].id);

    res.json({
      success: true,
      message: validatedData.type === "bug" 
        ? "Thank you for reporting this issue. We'll look into it!" 
        : "Thank you for your feedback!",
      id: feedbackEntry[0].id,
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.slice(7);
    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token));
    
    if (sessions.length === 0 || new Date(sessions[0].expiresAt) <= new Date()) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const allFeedback = await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(100);

    res.json({ feedback: allFeedback });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

export default router;
