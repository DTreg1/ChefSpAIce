/**
 * Type-safe helpers for storage operations
 * Eliminates need for 'as any' in database operations
 */

import { z } from "zod";

/**
 * Helper to create type-safe insert data
 * Ensures data matches schema requirements without 'as any'
 */
export function createInsertData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const validated = schema.parse(data);
  return validated;
}

/**
 * Helper to create partial update data
 * Removes undefined values for clean updates
 */
export function createUpdateData<T extends Record<string, any>>(
  data: T,
): Partial<T> {
  const cleaned = {} as Partial<T>;
  for (const key in data) {
    if (data[key] !== undefined) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
}

/**
 * Helper for batch inserts
 * Validates and prepares multiple records
 */
export function prepareBatchInsert<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
): T[] {
  return items.map((item) => schema.parse(item));
}

/**
 * Type guard for checking if object has required property
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}

/**
 * Safe JSON parse with type validation
 */
export function safeJsonParse<T>(
  json: string,
  schema?: z.ZodSchema<T>,
): T | null {
  try {
    const parsed = JSON.parse(json);
    if (schema) {
      return schema.parse(parsed);
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Type-safe metadata builder
 */
export function buildMetadata<T extends Record<string, any>>(
  data: T,
): Record<string, any> {
  return { ...data };
}

/**
 * Helper for external API responses
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

/**
 * Type guard for API responses
 */
export function isApiError<T>(
  response: ApiResponse<T>,
): response is ApiResponse<T> & { error: string } {
  return !response.success && !!response.error;
}

/**
 * Transform external data to internal types
 */
export function transformExternalData<S, T>(
  source: S,
  transformer: (data: S) => T,
): T {
  return transformer(source);
}
