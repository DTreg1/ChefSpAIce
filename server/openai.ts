import OpenAI from "openai";
import { ApiError } from "./apiError";

// Using Replit AI Integrations blueprint - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.

// Validate required environment variables
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

// Track if OpenAI is properly configured
export const isOpenAIConfigured = !!(baseURL && apiKey);

let openai: OpenAI;

// Helper to create user-friendly error messages
class OpenAIConfigError extends ApiError {
  constructor() {
    super(
      "AI features are not available. The OpenAI integration needs to be configured.",
      503,
      JSON.stringify({
        help: "Please ensure the AI Integrations are properly set up in your Replit environment.",
        missingConfig: !baseURL ? "Base URL" : !apiKey ? "API Key" : "Unknown"
      })
    );
    this.name = "OpenAIConfigError";
  }
}

if (!isOpenAIConfigured) {
  console.warn('[OpenAI] AI Integrations not configured. AI features will be disabled.');
  console.warn('[OpenAI] To enable AI features, ensure AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY are set.');
  
  // Create a stub that will throw meaningful errors when AI features are actually used
  openai = new Proxy({} as OpenAI, {
    get: (target, prop) => {
      // Handle property access
      if (prop === 'chat' || prop === 'completions') {
        return new Proxy({}, {
          get: (innerTarget, innerProp) => {
            return async () => {
              throw new OpenAIConfigError();
            };
          }
        });
      }
      
      // Default handler for other properties/methods
      return async () => {
        throw new OpenAIConfigError();
      };
    }
  });
} else {
  openai = new OpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
    maxRetries: 3,
    timeout: 30000, // 30 seconds
  });
}

// Wrapper function for safe OpenAI calls with better error handling
export async function safeOpenAICall<T>(
  operation: () => Promise<T>,
  fallbackMessage?: string
): Promise<T> {
  if (!isOpenAIConfigured) {
    throw new OpenAIConfigError();
  }
  
  try {
    return await operation();
  } catch (error: any) {
    // Handle specific OpenAI errors
    if (error?.status === 401) {
      throw new ApiError("OpenAI authentication failed. Please check your API configuration.", 401);
    } else if (error?.status === 429) {
      throw new ApiError("AI service rate limit exceeded. Please try again in a few moments.", 429);
    } else if (error?.status === 500 || error?.status === 502 || error?.status === 503) {
      throw new ApiError(fallbackMessage || "AI service is temporarily unavailable. Please try again later.", 503);
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      throw new ApiError("Cannot connect to AI service. Please check your internet connection.", 503);
    } else if (error instanceof OpenAIConfigError) {
      throw error;
    } else {
      // Log unexpected errors for debugging
      console.error('[OpenAI] Unexpected error:', error);
      throw new ApiError(
        fallbackMessage || "An error occurred while processing your AI request.",
        500,
        JSON.stringify({ originalError: error.message })
      );
    }
  }
}

export { openai };
