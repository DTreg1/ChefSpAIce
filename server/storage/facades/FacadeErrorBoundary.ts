/**
 * @file server/storage/facades/FacadeErrorBoundary.ts
 * @description Facade-level error boundary utilities for consistent error handling
 *
 * This module provides utilities for facades to:
 * 1. Log errors at facade level before propagating
 * 2. Add facade context to errors without transforming error types
 * 3. Ensure StorageErrors bubble up correctly to callers
 *
 * IMPORTANT PATTERNS:
 * - Facades should NOT catch and swallow storage errors
 * - Facades may add context to errors before rethrowing
 * - Facades should NOT transform error types (let StorageErrors bubble up)
 */

import {
  StorageError,
  isStorageError,
  type StorageErrorContext,
} from "../errors";

/**
 * Facade context for error enrichment
 */
export interface FacadeContext {
  facade: "user" | "admin" | "platform";
  domain: string;
  operation: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Logs an error at facade level without transforming it.
 * Use this in catch blocks before rethrowing to add facade-level visibility.
 *
 * @param error - The error to log
 * @param context - Facade context for enriched logging
 */
export function logFacadeError(error: unknown, context: FacadeContext): void {
  const timestamp = new Date().toISOString();
  const prefix = `[FACADE:${context.facade.toUpperCase()}]`;

  if (isStorageError(error)) {
    console.error(
      `${prefix} ${timestamp} - ${context.domain}.${context.operation} failed:`,
      {
        errorCode: error.code,
        errorMessage: error.message,
        storageContext: error.context,
        facadeContext: context,
      },
    );
  } else if (error instanceof Error) {
    console.error(
      `${prefix} ${timestamp} - ${context.domain}.${context.operation} failed:`,
      {
        errorType: error.name,
        errorMessage: error.message,
        facadeContext: context,
        stack: error.stack,
      },
    );
  } else {
    console.error(
      `${prefix} ${timestamp} - ${context.domain}.${context.operation} failed:`,
      {
        error,
        facadeContext: context,
      },
    );
  }
}

/**
 * Enriches a StorageError with facade context without changing its type.
 * Returns the original error (mutated with additional context).
 *
 * @param error - The StorageError to enrich
 * @param context - Facade context to add
 * @returns The same error instance with enriched context
 */
export function enrichStorageErrorContext(
  error: StorageError,
  context: FacadeContext,
): StorageError {
  if (error.context) {
    error.context.additionalInfo = {
      ...error.context.additionalInfo,
      facade: context.facade,
      facadeOperation: `${context.domain}.${context.operation}`,
    };
  }
  return error;
}

/**
 * Wraps an async function with facade-level error boundary.
 * Logs errors and optionally enriches StorageError context before rethrowing.
 *
 * IMPORTANT: This does NOT transform error types - StorageErrors remain StorageErrors.
 *
 * @param fn - The async function to wrap
 * @param context - Facade context for error logging/enrichment
 * @returns Promise that resolves with the function result or rejects with the original error
 */
export async function withFacadeErrorBoundary<T>(
  fn: () => Promise<T>,
  context: FacadeContext,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logFacadeError(error, context);

    if (isStorageError(error)) {
      enrichStorageErrorContext(error, context);
    }

    throw error;
  }
}

/**
 * Synchronous version of withFacadeErrorBoundary for non-async operations.
 *
 * @param fn - The function to wrap
 * @param context - Facade context for error logging/enrichment
 * @returns The function result or throws the original error
 */
export function withFacadeErrorBoundarySync<T>(
  fn: () => T,
  context: FacadeContext,
): T {
  try {
    return fn();
  } catch (error) {
    logFacadeError(error, context);

    if (isStorageError(error)) {
      enrichStorageErrorContext(error, context);
    }

    throw error;
  }
}

/**
 * Helper function to handle errors consistently in the proxy.
 * Logs the error, enriches StorageError context, and rethrows.
 */
function handleProxyError(error: unknown, context: FacadeContext): never {
  logFacadeError(error, context);

  if (isStorageError(error)) {
    enrichStorageErrorContext(error, context);
  }

  throw error;
}

/**
 * Creates a proxy wrapper around a domain storage instance that automatically
 * applies facade error boundary to all method calls.
 *
 * This is useful for facades that want transparent error logging without
 * manually wrapping each method call.
 *
 * IMPORTANT: This proxy handles both synchronous throws and async rejections:
 * - Synchronous errors (thrown before returning a Promise) are caught immediately
 * - Async errors (Promise rejections) are caught via .catch()
 * Both paths log, enrich, and rethrow without transforming error types.
 *
 * @param domainStorage - The domain storage instance to wrap
 * @param facadeName - The facade name for context
 * @param domainName - The domain name for context
 * @returns A proxied version of the domain storage with error boundaries
 */
export function createDomainStorageProxy<T extends object>(
  domainStorage: T,
  facadeName: "user" | "admin" | "platform",
  domainName: string,
): T {
  return new Proxy(domainStorage, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === "function") {
        return function (...args: unknown[]) {
          const context: FacadeContext = {
            facade: facadeName,
            domain: domainName,
            operation: String(prop),
          };

          let result: unknown;

          try {
            result = value.apply(target, args);
          } catch (error) {
            handleProxyError(error, context);
          }

          if (result instanceof Promise) {
            return result.catch((error: unknown) => {
              handleProxyError(error, context);
            });
          }

          return result;
        };
      }

      return value;
    },
  });
}

/**
 * Type-safe helper for creating facade error context
 */
export function createFacadeContext(
  facade: "user" | "admin" | "platform",
  domain: string,
  operation: string,
  additionalInfo?: Record<string, unknown>,
): FacadeContext {
  return { facade, domain, operation, additionalInfo };
}
