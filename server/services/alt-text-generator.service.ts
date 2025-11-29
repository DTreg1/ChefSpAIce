/**
 * Alt Text Generator Service
 * 
 * Generates alt text for images using OpenAI GPT-4 Vision API.
 * Provides intelligent descriptions for accessibility and SEO.
 * 
 * Referenced from: blueprint:javascript_openai_ai_integrations
 */

import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry from "p-retry";
import type { ImageMetadata, AltTextQuality } from "@shared/schema";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Helper function to check if error is rate limit or quota violation
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

/**
 * Generate alt text for a single image
 */
export async function generateAltText(
  imageUrl: string,
  context?: string
): Promise<{
  altText: string;
  confidence: number;
  objectsDetected: string[];
  suggestions?: string[];
}> {
  try {
    const systemPrompt = `You are an expert in creating descriptive, accessible alt text for images. 
Your goal is to help visually impaired users understand images through screen readers and improve SEO.

Guidelines:
- Be descriptive but concise (typically 125 characters or less)
- Describe the main subject and important details
- Include relevant colors, emotions, and actions
- Avoid redundant phrases like "image of" or "picture of"
- For decorative images, suggest marking as decorative
- Consider the context if provided

Respond with a JSON object containing:
{
  "altText": "The descriptive alt text",
  "confidence": 0.0-1.0,
  "objectsDetected": ["list", "of", "objects"],
  "isDecorative": false,
  "suggestions": ["optional", "improvement", "suggestions"]
}`;

    const userPrompt = context 
      ? `Generate alt text for this image. Context: ${context}`
      : "Generate alt text for this image.";

    const response = await pRetry(
      async () => {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userPrompt },
                  { type: "image_url", image_url: { url: imageUrl } }
                ]
              }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 500,
            temperature: 0.7
          });

          const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
          
          return {
            altText: result.altText || "",
            confidence: result.confidence || 0.8,
            objectsDetected: result.objectsDetected || [],
            suggestions: result.suggestions || []
          };
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error; // Rethrow to trigger p-retry
          }
          throw error;
        }
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 10000,
        factor: 2,
      }
    );

    return response;
  } catch (error) {
    console.error("Failed to generate alt text:", error);
    throw new Error("Failed to generate alt text for image");
  }
}

/**
 * Batch process multiple images for alt text generation
 */
export async function batchGenerateAltText(
  images: Array<{
    imageUrl: string;
    context?: string;
  }>
): Promise<Array<{
  imageUrl: string;
  altText: string;
  confidence: number;
  objectsDetected: string[];
  suggestions?: string[];
  error?: string;
}>> {
  const limit = pLimit(2); // Process up to 2 images concurrently
  
  const processingPromises = images.map((image) =>
    limit(async () => {
      try {
        const result = await generateAltText(image.imageUrl, image.context);
        return {
          imageUrl: image.imageUrl,
          ...result
        };
      } catch (error) {
        console.error(`Failed to generate alt text for ${image.imageUrl}:`, error);
        return {
          imageUrl: image.imageUrl,
          altText: "",
          confidence: 0,
          objectsDetected: [],
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    })
  );
  
  return await Promise.all(processingPromises);
}

/**
 * Analyze alt text quality and provide scores
 */
export async function analyzeAltTextQuality(
  altText: string,
  imageUrl?: string,
  context?: string
): Promise<Partial<AltTextQuality>> {
  try {
    const systemPrompt = `You are an expert in accessibility and WCAG compliance.
Analyze the provided alt text and return quality metrics.

Scoring criteria:
- Length Score (0-100): Optimal length is 80-125 characters
- Descriptive Score (0-100): How well it describes the image
- Context Score (0-100): Relevance to surrounding content
- Keyword Score (0-100): SEO keyword inclusion (if context provided)
- Screen Reader Score (0-100): How well it works with screen readers
- WCAG Level: 'A', 'AA', or 'AAA' based on compliance

Respond with JSON containing scores and analysis.`;

    const userPrompt = `Analyze this alt text: "${altText}"${
      context ? `\nContext: ${context}` : ""
    }${imageUrl ? "\n[Image is provided for reference]" : ""}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    // Add image if URL provided for better analysis
    if (imageUrl) {
      messages[1] = {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    // Calculate overall scores
    const qualityScore = Math.round(
      (result.lengthScore + result.descriptiveScore + result.contextScore + result.keywordScore) / 4
    );
    
    const accessibilityScore = Math.round(
      (result.screenReaderScore + result.descriptiveScore) / 2
    );

    return {
      qualityScore: qualityScore || 0,
      accessibilityScore: accessibilityScore || 0,
      lengthScore: result.lengthScore || 0,
      descriptiveScore: result.descriptiveScore || 0,
      contextScore: result.contextScore || 0,
      keywordScore: result.keywordScore || 0,
      screenReaderScore: result.screenReaderScore || 0,
      wcagLevel: result.wcagLevel || null,
      hasColorDescription: result.hasColorDescription || false,
      hasTextDescription: result.hasTextDescription || false,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
      metadata: {
        wordCount: altText.split(/\s+/).length,
        readabilityScore: result.readabilityScore,
        sentimentScore: result.sentimentScore,
        technicalTerms: result.technicalTerms || []
      }
    };
  } catch (error) {
    console.error("Failed to analyze alt text quality:", error);
    // Return basic analysis on error
    const wordCount = altText.split(/\s+/).length;
    const lengthScore = wordCount >= 10 && wordCount <= 20 ? 100 : 
                       wordCount >= 5 && wordCount <= 30 ? 70 : 40;
    
    return {
      qualityScore: lengthScore,
      accessibilityScore: lengthScore,
      lengthScore,
      descriptiveScore: 50,
      contextScore: 50,
      keywordScore: 50,
      screenReaderScore: 60,
      metadata: {
        wordCount,
        readabilityScore: 0,
        sentimentScore: 0,
        technicalTerms: []
      }
    };
  }
}

/**
 * Generate alt text suggestions for improvement
 */
export async function generateAltTextSuggestions(
  currentAltText: string,
  imageUrl: string,
  context?: string
): Promise<string[]> {
  try {
    const systemPrompt = `You are an accessibility expert helping improve alt text.
Generate 3-5 alternative alt text suggestions that improve upon the current one.
Focus on:
- Better descriptiveness
- Appropriate length
- Screen reader compatibility
- SEO optimization
- WCAG compliance

Return a JSON array of suggestions.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Current alt text: "${currentAltText}"${
                context ? `\nContext: ${context}` : ""
              }\n\nProvide improved alternatives.`
            },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
      temperature: 0.8
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result.suggestions || [currentAltText];
  } catch (error) {
    console.error("Failed to generate alt text suggestions:", error);
    return [currentAltText];
  }
}

/**
 * Check if an image is decorative
 */
export async function checkIfDecorative(
  imageUrl: string,
  context?: string
): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [
        {
          role: "system",
          content: `Determine if an image is purely decorative and doesn't need alt text.
Decorative images include:
- Borders, spacers, or dividers
- Background patterns
- Purely aesthetic elements with no informational value
- Icons that are redundant with adjacent text

Return JSON: { "isDecorative": boolean, "reason": string }`
        },
        {
          role: "user",
          content: [
            { type: "text", text: context ? `Context: ${context}` : "Is this image decorative?" },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 200,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result.isDecorative || false;
  } catch (error) {
    console.error("Failed to check if image is decorative:", error);
    return false;
  }
}