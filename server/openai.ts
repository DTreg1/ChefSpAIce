import OpenAI from "openai";

// Using Replit AI Integrations blueprint - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.

// Validate required environment variables
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!baseURL || !apiKey) {
  console.warn('[OpenAI] Missing AI Integrations configuration. AI features may not work properly.');
  console.warn('[OpenAI] Ensure AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY are set.');
}

const openai = new OpenAI({
  baseURL: baseURL || 'https://api.openai.com/v1',  // Provide fallback URL
  apiKey: apiKey || 'missing-api-key',  // Provide placeholder to prevent immediate crash
});

export { openai };
