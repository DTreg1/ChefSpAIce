import { openai } from "../integrations/openai";
import type { Feedback } from "@shared/schema";

export interface ModerationResult {
  isFlagged: boolean;
  flagReason?: string;
  category?: string;
  priority?: string;
  sentiment?: string;
  tags?: string[];
  similarTo?: string;
  summary?: string;
}

export async function moderateFeedback(
  content: string,
  type: string,
  existingFeedback: Feedback[],
): Promise<ModerationResult> {
  try {
    const prompt = `You are an AI moderator for user feedback. Analyze the following feedback and provide:
1. Whether it should be flagged (inappropriate, spam, or abusive content)
2. Auto-categorize it (ui, functionality, content, performance, other)
3. Assign priority (low, medium, high, critical)
4. Detect sentiment (positive, negative, neutral)
5. Generate relevant tags (max 5)
6. Check if similar to existing feedback and provide the ID if found
7. Generate a brief summary (max 50 words)

Feedback Type: ${type}
Feedback Content: "${content}"

Existing Feedback (to check for duplicates):
${existingFeedback
  .slice(0, 20)
  .map((f) => `ID: ${f.id}, Content: ${f.message || "N/A"}`)
  .join("\n")}

Respond ONLY with a valid JSON object in this exact format:
{
  "isFlagged": boolean,
  "flagReason": "string or null",
  "category": "ui|functionality|content|performance|other",
  "priority": "low|medium|high|critical",
  "sentiment": "positive|negative|neutral",
  "tags": ["tag1", "tag2"],
  "similarTo": "feedback_id or null",
  "summary": "brief summary"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI moderator that analyzes user feedback. Always respond with valid JSON only, no additional text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      isFlagged: result.isFlagged || false,
      flagReason: result.flagReason || undefined,
      category: result.category || undefined,
      priority: result.priority || undefined,
      sentiment: result.sentiment || undefined,
      tags: result.tags || [],
      similarTo: result.similarTo || undefined,
      summary: result.summary || undefined,
    };
  } catch (error) {
    console.error("Error moderating feedback:", error);
    // Return safe defaults if moderation fails
    return {
      isFlagged: false,
      category: "other",
      priority: type === "bug" ? "medium" : "low",
      sentiment: "neutral",
      tags: [],
    };
  }
}

export async function consolidateFeedback(
  feedbackItems: Feedback[],
): Promise<string> {
  try {
    if (feedbackItems.length === 0) {
      return "No feedback available.";
    }

    const prompt = `Consolidate and summarize the following user feedback into key themes and insights. Group similar feedback together and highlight the most important points.

Feedback:
${feedbackItems.map((f, i) => `${i + 1}. [${f.type}] ${f.message || "N/A"} (Priority: ${f.priority || "N/A"}, Sentiment: ${f.sentiment || "N/A"})`).join("\n")}

Provide a concise summary (max 300 words) highlighting:
- Main themes and patterns
- Critical issues requiring immediate attention
- Most requested features
- Overall sentiment trends`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that analyzes and consolidates user feedback.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0].message.content || "Unable to generate summary.";
  } catch (error) {
    console.error("Error consolidating feedback:", error);
    return "Error generating feedback summary.";
  }
}
