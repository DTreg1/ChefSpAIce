/**
 * Circuit Breaker Pattern
 *
 * Prevents cascading failures by failing fast when a service is down.
 * Implements the three states: CLOSED, OPEN, and HALF_OPEN.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

import { AIError, AIErrorCode } from "./ai-error-handler";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Number of failures before opening
  recoveryTimeout?: number; // Time before attempting recovery (ms)
  successThreshold?: number; // Successes needed to close from half-open
  monitoringWindow?: number; // Time window for counting failures (ms)
  halfOpenMaxAttempts?: number; // Max concurrent attempts in half-open state
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  stateChanges: Array<{
    from: CircuitState;
    to: CircuitState;
    timestamp: number;
    reason: string;
  }>;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  private failureTimestamps: number[] = [];

  // Statistics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private stateChanges: Array<{
    from: CircuitState;
    to: CircuitState;
    timestamp: number;
    reason: string;
  }> = [];

  private readonly config: Required<CircuitBreakerConfig>;

  constructor(
    private readonly name: string,
    config: CircuitBreakerConfig = {},
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      recoveryTimeout: config.recoveryTimeout ?? 60000, // 1 minute
      successThreshold: config.successThreshold ?? 3,
      monitoringWindow: config.monitoringWindow ?? 60000, // 1 minute
      halfOpenMaxAttempts: config.halfOpenMaxAttempts ?? 1,
    };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check circuit state
    const currentState = this.getState();

    if (currentState === "open") {
      // Check if we should transition to half-open
      if (this.shouldAttemptReset()) {
        this.transitionTo("half-open", "Recovery timeout reached");
      } else {
        // Fail fast while circuit is open
        throw new AIError(
          `Circuit breaker is open for ${this.name}`,
          AIErrorCode.CIRCUIT_OPEN,
          503,
          true,
          "Service temporarily unavailable. Please try again later.",
          this.getTimeUntilReset(),
        );
      }
    }

    // Check if we're in half-open and at max attempts
    if (
      currentState === "half-open" &&
      this.halfOpenAttempts >= this.config.halfOpenMaxAttempts
    ) {
      throw new AIError(
        `Circuit breaker is testing recovery for ${this.name}`,
        AIErrorCode.CIRCUIT_OPEN,
        503,
        true,
        "Service is recovering. Please wait a moment.",
        5000, // Try again in 5 seconds
      );
    }

    // Track half-open attempts
    if (currentState === "half-open") {
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    } finally {
      // Reset half-open attempts counter after execution
      if (currentState === "half-open") {
        this.halfOpenAttempts--;
      }
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    // Clean old failure timestamps outside monitoring window
    this.cleanOldFailures();
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime || null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      stateChanges: [...this.stateChanges],
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.transitionTo("closed", "Manual reset");
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    this.halfOpenAttempts = 0;
  }

  /**
   * Force the circuit to open
   */
  trip(reason: string = "Manual trip"): void {
    this.transitionTo("open", reason);
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.successes++;

    if (this.state === "half-open") {
      // Check if we've had enough successes to close the circuit
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(
          "closed",
          `${this.config.successThreshold} successful requests`,
        );
        this.failures = 0;
        this.successes = 0;
        this.failureTimestamps = [];
      }
    } else if (this.state === "closed") {
      // Reset failure count on success in closed state
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  private onFailure(): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();
    this.failureTimestamps.push(Date.now());

    if (this.state === "closed") {
      // Clean old failures and check if we should open
      this.cleanOldFailures();

      if (this.failureTimestamps.length >= this.config.failureThreshold) {
        this.transitionTo(
          "open",
          `${this.config.failureThreshold} failures in monitoring window`,
        );
      }
    } else if (this.state === "half-open") {
      // Single failure in half-open state reopens the circuit
      this.transitionTo("open", "Failure during recovery test");
      this.successes = 0;
    }
  }

  private shouldAttemptReset(): boolean {
    if (this.state !== "open") {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  private getTimeUntilReset(): number {
    if (this.state !== "open") {
      return 0;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    const timeUntilReset = Math.max(
      0,
      this.config.recoveryTimeout - timeSinceLastFailure,
    );
    return timeUntilReset;
  }

  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.failureTimestamps = this.failureTimestamps.filter((ts) => ts > cutoff);
  }

  private transitionTo(newState: CircuitState, reason: string): void {
    if (this.state !== newState) {
      const change = {
        from: this.state,
        to: newState,
        timestamp: Date.now(),
        reason,
      };

      this.stateChanges.push(change);

      // Keep only last 100 state changes
      if (this.stateChanges.length > 100) {
        this.stateChanges = this.stateChanges.slice(-100);
      }

      console.log(
        `[CircuitBreaker:${this.name}] State transition: ${change.from} -> ${change.to} (${reason})`,
      );

      this.state = newState;

      // Reset half-open attempts when changing state
      if (newState !== "half-open") {
        this.halfOpenAttempts = 0;
      }
    }
  }
}

/**
 * Global circuit breaker registry
 */
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  /**
   * Get statistics for all breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }
}

// Export singleton instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Export convenience function
export function getCircuitBreaker(
  name: string,
  config?: CircuitBreakerConfig,
): CircuitBreaker {
  return circuitBreakerRegistry.getBreaker(name, config);
}
