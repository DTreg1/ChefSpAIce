/**
 * Circuit Breaker Middleware
 *
 * Provides circuit breaker pattern implementation for external service calls.
 * Prevents cascading failures by temporarily blocking requests to failing services.
 */

import type { Request, Response, NextFunction } from "express";
import {
  getCircuitBreaker,
  CircuitBreakerConfig,
} from "../utils/circuit-breaker";

/**
 * OpenAI circuit breaker configurations
 */
const openaiConfigs = {
  standard: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    successThreshold: 2,
    monitoringWindow: 60000,
    halfOpenMaxAttempts: 2,
  },
  generation: {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    successThreshold: 1,
    monitoringWindow: 60000,
    halfOpenMaxAttempts: 1,
  },
  vision: {
    failureThreshold: 3,
    recoveryTimeout: 45000,
    successThreshold: 2,
    monitoringWindow: 60000,
    halfOpenMaxAttempts: 1,
  },
};

/**
 * Pre-configured circuit breakers for common services
 */
export const circuitBreakers = {
  // OpenAI service breakers
  openaiChat: getCircuitBreaker("openai-chat-standard", openaiConfigs.standard),
  openaiGeneration: getCircuitBreaker(
    "openai-generation",
    openaiConfigs.generation,
  ),
  openaiVision: getCircuitBreaker("openai-vision", openaiConfigs.vision),
  openaiRecipe: getCircuitBreaker(
    "openai-recipe-generation",
    openaiConfigs.standard,
  ),

  // Other external service breakers
  stripePayments: getCircuitBreaker("stripe-payments", {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    successThreshold: 1,
  }),

  emailService: getCircuitBreaker("email-service", {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    successThreshold: 2,
  }),

  usdaApi: getCircuitBreaker("usda-api", {
    failureThreshold: 10,
    recoveryTimeout: 120000,
    successThreshold: 3,
  }),
};

/**
 * Circuit breaker middleware factory
 *
 * Creates middleware that checks circuit breaker state before allowing requests.
 * Returns 503 Service Unavailable if circuit is open.
 *
 * @param breakerName - Name of the circuit breaker to use
 * @param config - Optional circuit breaker configuration
 * @returns Express middleware function
 *
 * @example
 * router.post('/api/ai/generate',
 *   isAuthenticated,
 *   withCircuitBreaker('openai-generation'),
 *   async (req, res) => {
 *     // Handler code
 *   }
 * );
 */
export function withCircuitBreaker(
  breakerName: string,
  config?: CircuitBreakerConfig,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const breaker = getCircuitBreaker(breakerName, config);
      const stats = breaker.getStats();

      // Check if circuit is open
      if (stats.state === "open") {
        return res.status(503).json({
          error: "Service temporarily unavailable",
          details:
            "The service is experiencing issues. Please try again later.",
          retryAfter: Math.ceil(
            (stats.lastFailureTime! +
              (config?.recoveryTimeout || 60000) -
              Date.now()) /
              1000,
          ),
        });
      }

      // Store circuit breaker in request for use in handler
      (req as any).circuitBreaker = breaker;

      next();
    } catch (error) {
      console.error(
        `Circuit breaker middleware error for ${breakerName}:`,
        error,
      );
      // Allow request to proceed if circuit breaker check fails
      next();
    }
  };
}

/**
 * OpenAI-specific circuit breaker middleware
 *
 * Pre-configured middleware for OpenAI API endpoints.
 * Includes appropriate failure thresholds and recovery timeouts.
 *
 * @param service - The OpenAI service type ('chat', 'generation', 'vision')
 * @returns Express middleware function
 */
export function openaiCircuitBreaker(
  service: "chat" | "generation" | "vision" = "chat",
) {
  const configMap = {
    chat: openaiConfigs.standard,
    generation: openaiConfigs.generation,
    vision: openaiConfigs.vision,
  };

  return withCircuitBreaker(`openai-${service}`, configMap[service]);
}

/**
 * Multi-service circuit breaker
 *
 * Checks multiple circuit breakers and fails if any are open.
 * Useful for endpoints that depend on multiple external services.
 *
 * @param breakerNames - Array of circuit breaker names to check
 * @returns Express middleware function
 *
 * @example
 * router.post('/api/process',
 *   isAuthenticated,
 *   multiCircuitBreaker(['openai-chat', 'stripe-payments']),
 *   handler
 * );
 */
export function multiCircuitBreaker(breakerNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const openBreakers: string[] = [];
      let shortestRetryAfter = Infinity;

      for (const name of breakerNames) {
        const breaker = getCircuitBreaker(name);
        const stats = breaker.getStats();

        if (stats.state === "open") {
          openBreakers.push(name);
          const retryAfter = Math.ceil(
            (stats.lastFailureTime! + 60000 - Date.now()) / 1000,
          );
          shortestRetryAfter = Math.min(shortestRetryAfter, retryAfter);
        }
      }

      if (openBreakers.length > 0) {
        return res.status(503).json({
          error: "Services temporarily unavailable",
          details: `The following services are experiencing issues: ${openBreakers.join(", ")}`,
          retryAfter: shortestRetryAfter,
        });
      }

      next();
    } catch (error) {
      console.error("Multi-circuit breaker error:", error);
      next();
    }
  };
}

/**
 * Circuit breaker with fallback
 *
 * Provides fallback behavior when circuit is open.
 * Useful for non-critical features that can gracefully degrade.
 *
 * @param breakerName - Name of the circuit breaker
 * @param fallbackHandler - Handler to execute when circuit is open
 * @returns Express middleware function
 *
 * @example
 * const fallback = (req, res) => {
 *   res.json({
 *     recommendations: [],
 *     message: "Recommendations temporarily unavailable"
 *   });
 * };
 *
 * router.get('/api/recommendations',
 *   withFallback('recommendation-service', fallback),
 *   normalHandler
 * );
 */
export function withFallback(
  breakerName: string,
  fallbackHandler: (req: Request, res: Response) => void,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const breaker = getCircuitBreaker(breakerName);
      const stats = breaker.getStats();

      if (stats.state === "open") {
        // Execute fallback instead of returning error
        return fallbackHandler(req, res);
      }

      (req as any).circuitBreaker = breaker;
      next();
    } catch (error) {
      console.error(
        `Circuit breaker fallback error for ${breakerName}:`,
        error,
      );
      next();
    }
  };
}

/**
 * Execute function with circuit breaker protection
 *
 * Wraps a function call with circuit breaker logic.
 * Records success/failure and manages circuit state.
 *
 * @param breaker - Circuit breaker instance or name
 * @param fn - Function to execute
 * @returns Result of function execution
 *
 * @example
 * const result = await executeWithBreaker(
 *   circuitBreakers.openaiChat,
 *   async () => {
 *     return await openai.chat.completions.create(params);
 *   }
 * );
 */
export async function executeWithBreaker<T>(
  breaker: any | string,
  fn: () => Promise<T>,
): Promise<T> {
  const circuitBreaker =
    typeof breaker === "string" ? getCircuitBreaker(breaker) : breaker;

  return circuitBreaker.execute(fn);
}

/**
 * Get circuit breaker stats middleware
 *
 * Adds circuit breaker statistics to response headers.
 * Useful for monitoring and debugging.
 *
 * @param breakerName - Name of the circuit breaker
 * @returns Express middleware function
 */
export function addCircuitBreakerStats(breakerName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const breaker = getCircuitBreaker(breakerName);
      const stats = breaker.getStats();

      res.setHeader("X-Circuit-Breaker-State", stats.state);
      res.setHeader("X-Circuit-Breaker-Failures", stats.failures.toString());
      res.setHeader("X-Circuit-Breaker-Successes", stats.successes.toString());

      next();
    } catch (error) {
      console.error(
        `Error adding circuit breaker stats for ${breakerName}:`,
        error,
      );
      next();
    }
  };
}
