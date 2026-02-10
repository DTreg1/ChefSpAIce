import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { feedback, feedbackBuckets, userSessions, users } from "../../shared/schema";
import { eq, desc, isNull } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import { successResponse } from "../lib/apiResponse";
import { hashToken } from "../lib/auth-utils";

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

async function getAuthenticatedAdmin(authHeader: string | undefined): Promise<typeof users.$inferSelect> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Authentication required", "AUTH_REQUIRED");
  }
  
  const rawToken = authHeader.slice(7);
  const hashedToken = hashToken(rawToken);
  const sessions = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, hashedToken));
  
  if (sessions.length === 0 || new Date(sessions[0].expiresAt) <= new Date()) {
    throw AppError.unauthorized("Invalid session", "INVALID_SESSION");
  }

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, sessions[0].userId));

  if (userResult.length === 0) {
    throw AppError.unauthorized("User not found", "USER_NOT_FOUND");
  }

  if (!userResult[0].isAdmin) {
    throw AppError.forbidden("Admin access required", "ADMIN_REQUIRED");
  }

  return userResult[0];
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
    logger.error("AI categorization failed, creating new bucket", { error: error instanceof Error ? error.message : String(error) });
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

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = feedbackRequestSchema.parse(req.body);
    
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith("Bearer ")) {
      const rawToken = authHeader.slice(7);
      const hashedToken = hashToken(rawToken);
      const sessions = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.token, hashedToken));
      
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
      logger.error("Background categorization failed", { error: err instanceof Error ? err.message : String(err) });
    });

    logger.info("New feedback submitted", { type: validatedData.type, feedbackId: createdFeedback.id });

    res.json(successResponse(
      { id: createdFeedback.id },
      validatedData.type === "bug" 
        ? "Thank you for reporting this issue. We'll look into it!" 
        : "Thank you for your feedback!"
    ));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(AppError.badRequest("Invalid feedback data", "VALIDATION_ERROR").withDetails(error.errors));
    }
    next(error);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

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

    res.json(successResponse({ feedback: filtered }));
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

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

    res.json(successResponse(stats));
  } catch (error) {
    next(error);
  }
});

router.get("/buckets", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

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

    res.json(successResponse({ buckets: bucketsWithItems }));
  } catch (error) {
    next(error);
  }
});

router.post("/buckets/:id/generate-prompt", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw AppError.badRequest("Invalid bucket ID", "INVALID_BUCKET_ID");
    }

    const bucketResult = await db
      .select()
      .from(feedbackBuckets)
      .where(eq(feedbackBuckets.id, id));

    if (bucketResult.length === 0) {
      throw AppError.notFound("Bucket not found", "BUCKET_NOT_FOUND");
    }

    const bucket = bucketResult[0];
    const items = await db
      .select()
      .from(feedback)
      .where(eq(feedback.bucketId, id));

    if (items.length === 0) {
      throw AppError.badRequest("Bucket has no feedback items", "EMPTY_BUCKET");
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

      res.json(successResponse({ prompt: generatedPrompt, bucketId: id }));
    } catch (aiError) {
      logger.error("AI prompt generation failed", { error: aiError instanceof Error ? aiError.message : String(aiError) });

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

      res.json(successResponse({ prompt: fallbackPrompt, bucketId: id }));
    }
  } catch (error) {
    next(error);
  }
});

router.post("/buckets/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw AppError.badRequest("Invalid bucket ID", "INVALID_BUCKET_ID");
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

    logger.info("Bucket marked as completed", { bucketId: id });

    res.json(successResponse(null, "Bucket and all feedback items marked as completed"));
  } catch (error) {
    next(error);
  }
});

router.post("/categorize-uncategorized", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

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
        logger.error("Failed to categorize feedback", { feedbackId: item.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    res.json(successResponse(null, `Categorized ${categorized} of ${uncategorized.length} uncategorized items`));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw AppError.badRequest("Invalid feedback ID", "INVALID_FEEDBACK_ID");
    }

    const result = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, id));

    if (result.length === 0) {
      throw AppError.notFound("Feedback not found", "FEEDBACK_NOT_FOUND");
    }

    res.json(successResponse(result[0]));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAuthenticatedAdmin(req.headers.authorization);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw AppError.badRequest("Invalid feedback ID", "INVALID_FEEDBACK_ID");
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
      throw AppError.notFound("Feedback not found", "FEEDBACK_NOT_FOUND");
    }

    logger.info("Feedback updated", { feedbackId: id, updatedFields: Object.keys(updateValues) });

    res.json(successResponse(result[0]));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(AppError.badRequest("Invalid update data", "VALIDATION_ERROR").withDetails(error.errors));
    }
    next(error);
  }
});

export default router;
