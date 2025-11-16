/**
 * OpenAI Configuration
 * 
 * Centralized configuration for OpenAI API clients.
 * Handles both direct OpenAI API and Replit AI integrations.
 */

import OpenAI from 'openai';
import { getSafeEnvVar } from './env-validator';

/**
 * Get OpenAI client instance
 * Returns null if no API key is configured
 */
export function getOpenAIClient(): OpenAI | null {
  // Check for Replit AI integrations first (preferred in Replit environment)
  const replitApiKey = getSafeEnvVar('AI_INTEGRATIONS_OPENAI_API_KEY');
  const replitBaseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  if (replitApiKey && replitBaseURL) {
    return new OpenAI({
      apiKey: replitApiKey,
      baseURL: replitBaseURL
    });
  }
  
  // Fall back to direct OpenAI API
  const openaiApiKey = getSafeEnvVar('OPENAI_API_KEY');
  
  if (openaiApiKey) {
    return new OpenAI({
      apiKey: openaiApiKey
    });
  }
  
  // No valid API key configured
  console.warn('⚠️  OpenAI API key not configured. AI features will be disabled.');
  return null;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!(getSafeEnvVar('AI_INTEGRATIONS_OPENAI_API_KEY') || getSafeEnvVar('OPENAI_API_KEY'));
}

/**
 * Get OpenAI client or throw error if not configured
 * Use this in routes that absolutely require OpenAI
 */
export function requireOpenAIClient(): OpenAI {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI API is not configured. Please set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY environment variable.');
  }
  
  return client;
}