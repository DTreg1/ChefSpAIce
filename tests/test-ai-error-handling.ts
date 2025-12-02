/**
 * Test AI Error Handling
 *
 * Script to test various error scenarios for OpenAI API integration
 * Run this file to simulate different error conditions and verify handling
 */

import {
  handleOpenAIError,
  AIError,
  AIErrorCode,
  retryWithBackoff,
} from "../utils/ai-error-handler";
import { getCircuitBreaker } from "../utils/circuit-breaker";
import axios from "axios";

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN; // Set this if authentication is required

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  // console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName: string) {
  log(`\n📝 Testing: ${testName}`, colors.bright);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

// Test 1: Rate Limit Error Handling
async function testRateLimitHandling() {
  logTest("Rate Limit Error Handling");

  const mockRateLimitError = {
    response: {
      status: 429,
      data: {
        error: {
          message: "Rate limit exceeded",
          type: "rate_limit_error",
        },
      },
      headers: {
        "retry-after": "10",
      },
    },
  };

  try {
    const aiError = handleOpenAIError(mockRateLimitError);

    if (aiError.code === AIErrorCode.RATE_LIMIT && aiError.retryable) {
      logSuccess("Rate limit error properly identified");
      logInfo(`Retry after: ${aiError.retryAfter}ms`);
    } else {
      logError("Rate limit error not properly handled");
    }
  } catch (error) {
    logError(`Test failed: ${error}`);
  }
}

// Test 2: Circuit Breaker Functionality
async function testCircuitBreaker() {
  logTest("Circuit Breaker Pattern");

  const breaker = getCircuitBreaker("test-circuit", {
    failureThreshold: 3,
    recoveryTimeout: 5000,
    successThreshold: 2,
  });

  // Reset the circuit to start fresh
  breaker.reset();
  logInfo("Circuit breaker reset to closed state");

  // Simulate failures to open the circuit
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error("Simulated failure");
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logWarning(`Failure ${i + 1}: ${message}`);
    }
  }

  // Check if circuit is now open
  const stats = breaker.getStats();
  if (stats.state === "open") {
    logSuccess("Circuit opened after threshold failures");
  } else {
    logError(`Circuit should be open but is ${stats.state}`);
  }

  // Try to execute while circuit is open
  try {
    await breaker.execute(async () => {
      return "This should not execute";
    });
    logError("Circuit should have prevented execution");
  } catch (error) {
    if (error instanceof AIError && error.code === AIErrorCode.CIRCUIT_OPEN) {
      logSuccess("Circuit correctly prevented execution while open");
    } else {
      logError("Unexpected error type or code");
    }
  }

  // Wait for recovery timeout
  logInfo("Waiting 5 seconds for recovery timeout...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Circuit should transition to half-open
  try {
    await breaker.execute(async () => {
      return "Recovery attempt successful";
    });
    logSuccess("Circuit allowed test execution in half-open state");
  } catch {
    logError("Circuit should allow test in half-open state");
  }
}

// Test 3: Retry Logic with Exponential Backoff
async function testRetryLogic() {
  logTest("Retry Logic with Exponential Backoff");

  let attemptCount = 0;
  const startTime = Date.now();

  try {
    await retryWithBackoff(
      async () => {
        attemptCount++;
        logInfo(`Attempt ${attemptCount}`);

        if (attemptCount < 3) {
          // Simulate a retryable server error
          const serverError = {
            response: {
              status: 503,
              data: { error: { message: "Service temporarily unavailable" } },
            },
          };
          throw serverError;
        }

        return "Success after retries";
      },
      {
        maxRetries: 5,
        initialDelay: 100,
        maxDelay: 2000,
      },
    );

    const totalTime = Date.now() - startTime;
    logSuccess(`Succeeded after ${attemptCount} attempts in ${totalTime}ms`);
  } catch (error) {
    logError(`Failed after ${attemptCount} attempts: ${error}`);
  }
}

// Test 4: API Endpoint Error Handling
async function testAPIEndpoints() {
  logTest("API Endpoint Error Handling");

  const testCases = [
    {
      name: "Missing message",
      endpoint: "/api/chat",
      data: { includeInventory: false },
      expectedError: "VALIDATION_ERROR",
    },
    {
      name: "Normal chat request",
      endpoint: "/api/chat",
      data: {
        message: "Test message for error handling",
        includeInventory: false,
      },
    },
    {
      name: "Streaming chat request",
      endpoint: "/api/chat/stream",
      data: {
        message: "Test streaming with error handling",
        streamingEnabled: true,
      },
    },
  ];

  for (const testCase of testCases) {
    logInfo(`Testing: ${testCase.name}`);

    try {
      const headers: any = {
        "Content-Type": "application/json",
      };

      if (TEST_AUTH_TOKEN) {
        headers["Authorization"] = `Bearer ${TEST_AUTH_TOKEN}`;
      }

      const response = await axios.post(
        `${API_BASE_URL}${testCase.endpoint}`,
        testCase.data,
        {
          headers,
          validateStatus: () => true, // Don't throw on any status code
        },
      );

      if (response.status >= 200 && response.status < 300) {
        logSuccess(`${testCase.name}: Success (${response.status})`);
      } else {
        const errorData = response.data;
        if (
          testCase.expectedError &&
          errorData.code === testCase.expectedError
        ) {
          logSuccess(`${testCase.name}: Expected error received`);
        } else {
          logWarning(
            `${testCase.name}: Error ${errorData.code || response.status} - ${errorData.error || errorData.message}`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logError(`${testCase.name}: ${errorMessage}`);
    }
  }
}

// Test 5: Error Recovery and Metrics
async function testErrorMetrics() {
  logTest("Error Metrics and Monitoring");

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/admin/ai-metrics/health`,
      {
        validateStatus: () => true,
      },
    );

    if (response.status === 200) {
      const health = response.data;
      logSuccess(`Health check passed: ${JSON.stringify(health, null, 2)}`);
    } else if (response.status === 503) {
      const health = response.data;
      logWarning(`Service degraded: ${JSON.stringify(health, null, 2)}`);
    } else {
      logError(`Unexpected health status: ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Health check failed: ${errorMessage}`);
  }
}

// Test 6: Simulate OpenAI API Errors
async function testOpenAIErrorScenarios() {
  logTest("OpenAI API Error Scenarios");

  const errorScenarios = [
    {
      name: "Authentication Error",
      error: {
        response: {
          status: 401,
          data: { error: { message: "Invalid API key" } },
        },
      },
      expectedCode: AIErrorCode.AUTH_ERROR,
    },
    {
      name: "Context Length Exceeded",
      error: {
        response: {
          status: 400,
          data: {
            error: {
              message: "This model's maximum context length is 4096 tokens",
              code: "context_length_exceeded",
            },
          },
        },
      },
      expectedCode: AIErrorCode.CONTEXT_LENGTH_EXCEEDED,
    },
    {
      name: "Server Error",
      error: {
        response: {
          status: 500,
          data: { error: { message: "Internal server error" } },
        },
      },
      expectedCode: AIErrorCode.SERVER_ERROR,
    },
    {
      name: "Timeout Error",
      error: {
        code: "ECONNABORTED",
        message: "Request timeout",
      },
      expectedCode: AIErrorCode.TIMEOUT,
    },
  ];

  for (const scenario of errorScenarios) {
    const aiError = handleOpenAIError(scenario.error);

    if (aiError.code === scenario.expectedCode) {
      logSuccess(`${scenario.name}: Correctly identified as ${aiError.code}`);
      logInfo(`  Retryable: ${aiError.retryable}`);
      logInfo(`  User message: ${aiError.userMessage}`);
    } else {
      logError(
        `${scenario.name}: Expected ${scenario.expectedCode}, got ${aiError.code}`,
      );
    }
  }
}

// Main test runner
async function runTests() {
  log("\n" + "=".repeat(50), colors.bright);
  log("🧪 AI Error Handling Test Suite", colors.bright);
  log("=".repeat(50), colors.bright);

  try {
    await testRateLimitHandling();
    await testCircuitBreaker();
    await testRetryLogic();
    await testOpenAIErrorScenarios();

    // Only test API endpoints if configured
    if (TEST_AUTH_TOKEN || process.env.SKIP_AUTH) {
      await testAPIEndpoints();
      await testErrorMetrics();
    } else {
      logWarning("\nSkipping API tests (set TEST_AUTH_TOKEN to enable)");
    }

    log("\n" + "=".repeat(50), colors.bright);
    log("✨ Test suite completed", colors.green);
    log("=".repeat(50), colors.bright);
  } catch (error) {
    log("\n" + "=".repeat(50), colors.bright);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Test suite failed: ${errorMessage}`);
    log("=".repeat(50), colors.bright);
    process.exit(1);
  }
}

// Run tests when this file is executed directly
runTests();
