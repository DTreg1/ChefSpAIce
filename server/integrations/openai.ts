import OpenAI from "openai";

// Using Replit AI Integrations blueprint - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.

// Validate required environment variables
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

let openai: OpenAI;

if (!baseURL || !apiKey) {
  console.error("[OpenAI] Missing AI Integrations configuration.");
  console.error(
    "[OpenAI] Ensure AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY are set.",
  );

  // Create a stub that will throw meaningful errors when AI features are actually used
  openai = new Proxy({} as OpenAI, {
    get: (_target, _prop) => {
      return () => {
        throw new Error(
          "OpenAI is not configured. Please set AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY environment variables.",
        );
      };
    },
  });
} else {
  openai = new OpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
  });
}

export { openai };
