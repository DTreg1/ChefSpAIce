import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { feedback, feedbackBuckets, userSessions, users } from "../../shared/schema";
import { eq, desc, isNull } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

const updateFeedbackSchema = z.object({
  status: z.enum(["new", "reviewed", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  adminNotes: z.string().optional().nullable(),
  resolutionPrompt: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  bucketId: z.number().optional().nullable(),
});

type AuthResult = 
  | { error: string; status: number }
  | { user: typeof users.$inferSelect };

async function getAuthenticatedAdmin(authHeader: string | undefined): Promise<AuthResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Authentication required", status: 401 };
  }
  
  const token = authHeader.slice(7);
  const sessions = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, token));
  
  if (sessions.length === 0 || new Date(sessions[0].expiresAt) <= new Date()) {
    return { error: "Invalid session", status: 401 };
  }

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, sessions[0].userId));

  if (userResult.length === 0) {
    return { error: "User not found", status: 401 };
  }

  if (!userResult[0].isAdmin) {
    return { error: "Admin access required", status: 403 };
  }

  return { user: userResult[0] };
}

async function categorizeFeedback(feedbackItem: typeof feedback.$inferSelect): Promise<{ bucketId: number | null; isNewBucket: boolean }> {
  const existingBuckets = await db
    .select()
    .from(feedbackBuckets)
    .where(eq(feedbackBuckets.status, "open"));

  if (existingBuckets.length === 0) {
    const newBucket = await createNewBucket(feedbackItem);
    return { bucketId: newBucket.id, isNewBucket: true };
  }

  const bucketsContext = existingBuckets.map(b => ({
    id: b.id,
    title: b.title,
    description: b.description,
    type: b.bucketType,
  }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a feedback categorization assistant. Your task is to determine if a new feedback item belongs to an existing bucket or needs a new bucket.

Analyze the feedback and compare it to existing buckets. Return a JSON response with:
- "existingBucketId": the ID of an existing bucket if the feedback is similar (null if none match)
- "needsNewBucket": true if the feedback needs a new bucket, false otherwise
- "suggestedTitle": if needsNewBucket is true, provide a concise title for the new bucket
- "suggestedDescription": if needsNewBucket is true, provide a brief description

Be liberal in grouping similar feedback together. Group by the core issue or feature request, not by exact wording.`
        },
        {
          role: "user",
          content: `Existing buckets:
${JSON.stringify(bucketsContext, null, 2)}

New feedback to categorize:
Type: ${feedbackItem.type}
Category: ${feedbackItem.category || "Not specified"}
Message: ${feedbackItem.message}
Screen: ${feedbackItem.screenContext || "Not specified"}
${feedbackItem.stepsToReproduce ? `Steps to reproduce: ${feedbackItem.stepsToReproduce}` : ""}
${feedbackItem.severity ? `Severity: ${feedbackItem.severity}` : ""}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    if (result.existingBucketId && !result.needsNewBucket) {
      return { bucketId: result.existingBucketId, isNewBucket: false };
    }

    const newBucket = await db
      .insert(feedbackBuckets)
      .values({
        title: result.suggestedTitle || `${feedbackItem.type === "bug" ? "Bug" : "Feature"}: ${feedbackItem.message.substring(0, 50)}`,
        description: result.suggestedDescription || feedbackItem.message.substring(0, 200),
        bucketType: feedbackItem.type === "bug" ? "bug" : "feature",
        status: "open",
        priority: feedbackItem.priority || "medium",
      })
      .returning();

    return { bucketId: newBucket[0].id, isNewBucket: true };
  } catch (error) {
    console.error("AI categorization failed, creating new bucket:", error);
    const newBucket = await createNewBucket(feedbackItem);
    return { bucketId: newBucket.id, isNewBucket: true };
  }
}

async function createNewBucket(feedbackItem: typeof feedback.$inferSelect) {
  const bucketResult = await db
    .insert(feedbackBuckets)
    .values({
      title: `${feedbackItem.type === "bug" ? "Bug" : "Feature"}: ${feedbackItem.message.substring(0, 80)}`,
      description: feedbackItem.message.substring(0, 300),
      bucketType: feedbackItem.type === "bug" ? "bug" : "feature",
      status: "open",
      priority: feedbackItem.priority || "medium",
    })
    .returning();
  return bucketResult[0];
}

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
        priority: "medium",
      })
      .returning();

    const createdFeedback = feedbackEntry[0];
    
    categorizeFeedback(createdFeedback).then(async ({ bucketId }) => {
      if (bucketId) {
        await db
          .update(feedback)
          .set({ bucketId, updatedAt: new Date() })
          .where(eq(feedback.id, createdFeedback.id));
      }
    }).catch(err => {
      console.error("Background categorization failed:", err);
    });

    console.log(`[Feedback] New ${validatedData.type} submitted:`, createdFeedback.id);

    res.json({
      success: true,
      message: validatedData.type === "bug" 
        ? "Thank you for reporting this issue. We'll look into it!" 
        : "Thank you for your feedback!",
      id: createdFeedback.id,
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
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { status, type, priority } = req.query;

    const allFeedback = await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(200);

    let filtered = allFeedback;
    if (status && status !== "all") {
      filtered = filtered.filter(f => f.status === status);
    }
    if (type && type !== "all") {
      filtered = filtered.filter(f => f.type === type);
    }
    if (priority && priority !== "all") {
      filtered = filtered.filter(f => f.priority === priority);
    }

    res.json({ feedback: filtered });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const allFeedback = await db.select().from(feedback);
    const allBuckets = await db.select().from(feedbackBuckets);

    const stats = {
      total: allFeedback.length,
      uncategorized: allFeedback.filter(f => !f.bucketId).length,
      byStatus: {
        new: allFeedback.filter(f => f.status === "new").length,
        reviewed: allFeedback.filter(f => f.status === "reviewed").length,
        in_progress: allFeedback.filter(f => f.status === "in_progress").length,
        resolved: allFeedback.filter(f => f.status === "resolved").length,
        closed: allFeedback.filter(f => f.status === "closed").length,
      },
      byType: {
        feedback: allFeedback.filter(f => f.type === "feedback").length,
        bug: allFeedback.filter(f => f.type === "bug").length,
      },
      buckets: {
        total: allBuckets.length,
        open: allBuckets.filter(b => b.status === "open").length,
        in_progress: allBuckets.filter(b => b.status === "in_progress").length,
        completed: allBuckets.filter(b => b.status === "completed").length,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Feedback stats error:", error);
    res.status(500).json({ error: "Failed to fetch feedback stats" });
  }
});

router.get("/buckets", async (req: Request, res: Response) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { status } = req.query;

    let buckets = await db
      .select()
      .from(feedbackBuckets)
      .orderBy(desc(feedbackBuckets.createdAt));

    if (status && status !== "all") {
      buckets = buckets.filter(b => b.status === status);
    }

    const bucketsWithItems = await Promise.all(
      buckets.map(async (bucket) => {
        const items = await db
          .select()
          .from(feedback)
          .where(eq(feedback.bucketId, bucket.id))
          .orderBy(desc(feedback.createdAt));
        return { ...bucket, items };
      })
    );

    res.json({ buckets: bucketsWithItems });
  } catch (error) {
    console.error("Buckets fetch error:", error);
    res.status(500).json({ error: "Failed to fetch buckets" });
  }
});

router.post("/buckets/:id/generate-prompt", async (req: Request, res: Response) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid bucket ID" });
    }

    const bucketResult = await db
      .select()
      .from(feedbackBuckets)
      .where(eq(feedbackBuckets.id, id));

    if (bucketResult.length === 0) {
      return res.status(404).json({ error: "Bucket not found" });
    }

    const bucket = bucketResult[0];
    const items = await db
      .select()
      .from(feedback)
      .where(eq(feedback.bucketId, id));

    if (items.length === 0) {
      return res.status(400).json({ error: "Bucket has no feedback items" });
    }

    const feedbackSummary = items.map((item, idx) => 
      `### Feedback ${idx + 1} (ID: ${item.id})
- **Type:** ${item.type}
- **Category:** ${item.category || "Not specified"}
- **Screen/Context:** ${item.screenContext || "Not specified"}
- **Message:** ${item.message}
${item.stepsToReproduce ? `- **Steps to Reproduce:** ${item.stepsToReproduce}` : ""}
${item.severity ? `- **Severity:** ${item.severity}` : ""}
${item.deviceInfo ? `- **Device Info:** ${item.deviceInfo}` : ""}`
    ).join("\n\n");

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a technical product manager creating a detailed implementation prompt for a developer. 

Your task is to synthesize multiple feedback items into a single, comprehensive prompt that can be given to an AI coding assistant (like Replit Agent) to implement the fix or feature.

The prompt should:
1. Start with a clear, actionable title
2. Summarize the core issue or feature request
3. List specific requirements derived from all feedback items
4. Suggest implementation approach if applicable
5. Include any relevant technical context from the feedback
6. Specify testing criteria to verify the implementation

Be specific and technical. The prompt should be self-contained and provide all context needed for implementation.`
          },
          {
            role: "user",
            content: `Bucket: ${bucket.title}
Type: ${bucket.bucketType}
Description: ${bucket.description || "No description"}

Feedback items in this bucket:

${feedbackSummary}

Generate a comprehensive implementation prompt for addressing all these feedback items.`
          }
        ],
        max_completion_tokens: 2000,
      });

      const generatedPrompt = response.choices[0]?.message?.content || "";

      await db
        .update(feedbackBuckets)
        .set({ generatedPrompt, updatedAt: new Date() })
        .where(eq(feedbackBuckets.id, id));

      res.json({ prompt: generatedPrompt, bucketId: id });
    } catch (aiError) {
      console.error("AI prompt generation failed:", aiError);

      let fallbackPrompt = `## ${bucket.bucketType === "bug" ? "Bug Fix" : "Feature Implementation"}: ${bucket.title}

### Summary
${bucket.description || "Implementation needed based on user feedback."}

### User Feedback Items (${items.length} total)

${feedbackSummary}

### Requirements
${items.map((item, idx) => `${idx + 1}. Address: ${item.message.substring(0, 100)}...`).join("\n")}

### Testing
- Verify all reported issues are resolved
- Test on affected screens/contexts
- Ensure no regression in related functionality`;

      await db
        .update(feedbackBuckets)
        .set({ generatedPrompt: fallbackPrompt, updatedAt: new Date() })
        .where(eq(feedbackBuckets.id, id));

      res.json({ prompt: fallbackPrompt, bucketId: id });
    }
  } catch (error) {
    console.error("Prompt generation error:", error);
    res.status(500).json({ error: "Failed to generate prompt" });
  }
});

router.post("/buckets/:id/complete", async (req: Request, res: Response) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid bucket ID" });
    }

    const now = new Date();

    await db
      .update(feedbackBuckets)
      .set({ 
        status: "completed", 
        completedAt: now,
        updatedAt: now 
      })
      .where(eq(feedbackBuckets.id, id));

    await db
      .update(feedback)
      .set({ 
        status: "resolved", 
        resolvedAt: now,
        updatedAt: now 
      })
      .where(eq(feedback.bucketId, id));

    console.log(`[Feedback] Bucket ${id} marked as completed`);

    res.json({ success: true, message: "Bucket and all feedback items marked as completed" });
  } catch (error) {
    console.error("Bucket completion error:", error);
    res.status(500).json({ error: "Failed to complete bucket" });
  }
});

router.post("/categorize-uncategorized", async (req: Request, res: Response) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const uncategorized = await db
      .select()
      .from(feedback)
      .where(isNull(feedback.bucketId));

    let categorized = 0;
    for (const item of uncategorized) {
      try {
        const { bucketId } = await categorizeFeedback(item);
        if (bucketId) {
          await db
            .update(feedback)
            .set({ bucketId, updatedAt: new Date() })
            .where(eq(feedback.id, item.id));
          categorized++;
        }
      } catch (err) {
        console.error(`Failed to categorize feedback ${item.id}:`, err);
      }
    }

    res.json({ 
      success: true, 
      message: `Categorized ${categorized} of ${uncategorized.length} uncategorized items` 
    });
  } catch (error) {
    console.error("Categorization error:", error);
    res.status(500).json({ error: "Failed to categorize feedback" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid feedback ID" });
    }

    const result = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, id));

    if (result.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Feedback fetch error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid feedback ID" });
    }

    const validatedData = updateFeedbackSchema.parse(req.body);

    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (validatedData.status !== undefined) {
      updateValues.status = validatedData.status;
      if (validatedData.status === "resolved") {
        updateValues.resolvedAt = new Date();
      }
    }
    if (validatedData.priority !== undefined) {
      updateValues.priority = validatedData.priority;
    }
    if (validatedData.adminNotes !== undefined) {
      updateValues.adminNotes = validatedData.adminNotes;
    }
    if (validatedData.resolutionPrompt !== undefined) {
      updateValues.resolutionPrompt = validatedData.resolutionPrompt;
    }
    if (validatedData.assignedTo !== undefined) {
      updateValues.assignedTo = validatedData.assignedTo;
    }
    if (validatedData.bucketId !== undefined) {
      updateValues.bucketId = validatedData.bucketId;
    }

    const result = await db
      .update(feedback)
      .set(updateValues)
      .where(eq(feedback.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    console.log(`[Feedback] Updated feedback ${id}:`, Object.keys(updateValues));

    res.json(result[0]);
  } catch (error) {
    console.error("Feedback update error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid update data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

export default router;
