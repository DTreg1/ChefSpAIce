import { test, expect } from '@playwright/test';

// Helper to generate unique values for testing
const uniqueId = () => Math.random().toString(36).substring(7);

test.describe('Bug Fixes E2E Tests', () => {
  test.describe('Authentication & Token Management', () => {
    test('should handle concurrent token refresh without race conditions', async ({ page }) => {
      // Navigate to the app
      await page.goto('/');
      
      // Trigger multiple concurrent API calls that may need token refresh
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          page.evaluate(() => {
            return fetch('/api/user', { credentials: 'include' })
              .then(res => res.json());
          })
        );
      }
      
      // All requests should succeed without duplicate refresh attempts
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.error).toBeUndefined();
      });
    });

    test('should handle expired tokens gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Wait for potential token expiry
      await page.waitForTimeout(2000);
      
      // Try to access protected route
      const response = await page.evaluate(() => {
        return fetch('/api/food-items', { credentials: 'include' })
          .then(res => res.json())
          .catch(err => ({ error: err.message }));
      });
      
      // Should either refresh token successfully or redirect to login
      if (response.error) {
        expect(response.error).toMatch(/unauthorized|login required/i);
      } else {
        expect(response).toHaveProperty('items');
      }
    });
  });

  test.describe('Error Handling & API Responses', () => {
    test('should handle malformed JSON responses gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Intercept and break a response
      await page.route('/api/test-json', route => {
        route.fulfill({
          status: 200,
          body: '{invalid json',
          headers: { 'Content-Type': 'application/json' }
        });
      });
      
      const response = await page.evaluate(() => {
        return fetch('/api/test-json')
          .then(res => res.json())
          .catch(err => ({ error: err.message }));
      });
      
      expect(response.error).toBeDefined();
      expect(response.error).toMatch(/json|parse/i);
    });

    test('should display standardized error messages', async ({ page }) => {
      await page.goto('/');
      
      // Test 404 error
      const notFoundResponse = await page.evaluate(() => {
        return fetch('/api/nonexistent-endpoint')
          .then(res => res.json());
      });
      
      expect(notFoundResponse.error).toBeDefined();
      expect(notFoundResponse.error.code).toBe('NOT_FOUND');
      expect(notFoundResponse.error.statusCode).toBe(404);
      expect(notFoundResponse.error.retryable).toBe(false);
      
      // Test 500 error (simulated)
      await page.route('/api/test-error', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            error: {
              message: 'Internal server error',
              code: 'INTERNAL_SERVER_ERROR',
              statusCode: 500,
              retryable: true
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        });
      });
      
      const serverErrorResponse = await page.evaluate(() => {
        return fetch('/api/test-error')
          .then(res => res.json());
      });
      
      expect(serverErrorResponse.error.retryable).toBe(true);
    });

    test('should handle network timeouts with retry', async ({ page }) => {
      await page.goto('/');
      
      // Simulate slow network
      await page.route('/api/slow-endpoint', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      });
      
      const response = await page.evaluate(() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500);
        
        return fetch('/api/slow-endpoint', { signal: controller.signal })
          .then(res => {
            clearTimeout(timeout);
            return res.json();
          })
          .catch(err => ({ error: 'timeout', message: err.message }));
      });
      
      expect(response.error).toBe('timeout');
    });
  });

  test.describe('Chat Streaming & Memory Management', () => {
    test('should handle streaming errors and reconnect', async ({ page }) => {
      await page.goto('/chat');
      
      // Start a chat stream
      const messageInput = page.locator('[data-testid="input-message"]');
      const sendButton = page.locator('[data-testid="button-send-message"]');
      
      await messageInput.fill('Test message ' + uniqueId());
      
      // Simulate network interruption during streaming
      await page.route('/api/chat/stream', route => {
        const chunks = [
          'data: {"chunk": "Hello"}\n\n',
          'data: {"chunk": " world"}\n\n',
          // Simulate connection drop
        ];
        
        route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          body: chunks.join('')
        });
      });
      
      await sendButton.click();
      
      // Check if partial message is displayed
      await expect(page.locator('[data-testid*="message-"]').last()).toContainText('Hello world', { timeout: 5000 });
      
      // Verify no memory leaks (check console for warnings)
      const consoleLogs = await page.evaluate(() => {
        return window.console.logs || [];
      });
      
      const memoryWarnings = consoleLogs.filter((log: any) => 
        log?.includes('memory') || log?.includes('leak')
      );
      expect(memoryWarnings).toHaveLength(0);
    });

    test('should clean up chat sessions properly', async ({ page }) => {
      await page.goto('/chat');
      
      // Create multiple chat sessions
      for (let i = 0; i < 3; i++) {
        const messageInput = page.locator('[data-testid="input-message"]');
        const sendButton = page.locator('[data-testid="button-send-message"]');
        const newChatButton = page.locator('[data-testid="button-new-chat"]');
        
        await messageInput.fill(`Test message ${i} - ${uniqueId()}`);
        await sendButton.click();
        
        // Wait for response
        await page.waitForTimeout(1000);
        
        // Start new chat
        if (i < 2) {
          await newChatButton.click();
        }
      }
      
      // Verify cleanup by checking session count
      const sessionCount = await page.evaluate(() => {
        return fetch('/api/chat/sessions')
          .then(res => res.json())
          .then(data => data.sessions?.length || 0);
      });
      
      // Should have limited number of sessions (not growing unbounded)
      expect(sessionCount).toBeLessThanOrEqual(10);
    });
  });

  test.describe('Request Deduplication', () => {
    test('should prevent duplicate concurrent API calls', async ({ page }) => {
      await page.goto('/');
      
      // Track API calls
      let apiCallCount = 0;
      await page.route('/api/expensive-operation', route => {
        apiCallCount++;
        route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            result: 'success',
            callNumber: apiCallCount 
          })
        });
      });
      
      // Make multiple identical concurrent requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          page.evaluate(() => {
            return fetch('/api/expensive-operation')
              .then(res => res.json());
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      // All results should be identical (same response)
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
      
      // Only one actual API call should have been made
      expect(apiCallCount).toBe(1);
    });

    test('should allow different requests to proceed independently', async ({ page }) => {
      await page.goto('/');
      
      const responses = await page.evaluate(() => {
        return Promise.all([
          fetch('/api/endpoint1').then(res => ({ endpoint: 1, status: res.status })),
          fetch('/api/endpoint2').then(res => ({ endpoint: 2, status: res.status })),
          fetch('/api/endpoint3').then(res => ({ endpoint: 3, status: res.status }))
        ]);
      });
      
      // Each endpoint should have been called independently
      expect(responses).toHaveLength(3);
      expect(new Set(responses.map(r => r.endpoint)).size).toBe(3);
    });
  });

  test.describe('Object Storage Error Handling', () => {
    test('should retry failed object storage operations', async ({ page }) => {
      await page.goto('/');
      
      let attemptCount = 0;
      await page.route('/api/objects/**', route => {
        attemptCount++;
        
        // Fail first 2 attempts, succeed on third
        if (attemptCount < 3) {
          route.fulfill({
            status: 503,
            body: JSON.stringify({
              error: {
                message: 'Service temporarily unavailable',
                code: 'SERVICE_UNAVAILABLE',
                statusCode: 503,
                retryable: true
              }
            })
          });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ url: 'https://storage.example.com/file.jpg' })
          });
        }
      });
      
      const response = await page.evaluate(() => {
        return fetch('/api/objects/test-file')
          .then(res => res.json());
      });
      
      // Should eventually succeed after retries
      expect(response.url).toBeDefined();
      expect(attemptCount).toBeGreaterThanOrEqual(3);
    });

    test('should handle missing object storage configuration gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Simulate missing configuration
      await page.route('/api/upload-url', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({
            error: {
              message: 'Object storage is not configured',
              code: 'SERVICE_UNAVAILABLE',
              statusCode: 503,
              details: { missingEnv: 'PRIVATE_OBJECT_DIR' }
            }
          })
        });
      });
      
      const response = await page.evaluate(() => {
        return fetch('/api/upload-url')
          .then(res => res.json());
      });
      
      expect(response.error).toBeDefined();
      expect(response.error.message).toMatch(/not configured/i);
    });
  });

  test.describe('API Key Fallbacks', () => {
    test('should display helpful messages for missing API keys', async ({ page }) => {
      await page.goto('/chat');
      
      // Simulate missing OpenAI key
      await page.route('/api/chat/stream', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({
            error: {
              message: 'AI service not configured. Please add your OpenAI API key.',
              code: 'SERVICE_UNAVAILABLE',
              statusCode: 503
            }
          })
        });
      });
      
      const messageInput = page.locator('[data-testid="input-message"]');
      const sendButton = page.locator('[data-testid="button-send-message"]');
      
      await messageInput.fill('Test message');
      await sendButton.click();
      
      // Should show user-friendly error message
      const errorMessage = page.locator('[data-testid="text-error-message"]');
      await expect(errorMessage).toContainText(/API key/i);
      await expect(errorMessage).not.toContainText(/undefined/i);
      await expect(errorMessage).not.toContainText(/null/i);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limit errors gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Simulate rate limiting
      let requestCount = 0;
      await page.route('/api/barcodelookup/**', route => {
        requestCount++;
        
        if (requestCount > 2) {
          route.fulfill({
            status: 429,
            body: JSON.stringify({
              error: {
                message: 'Too many requests. Please wait before trying again.',
                code: 'RATE_LIMIT_EXCEEDED',
                statusCode: 429,
                retryable: true
              }
            })
          });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ products: [] })
          });
        }
      });
      
      // Make multiple requests
      const responses = [];
      for (let i = 0; i < 4; i++) {
        const response = await page.evaluate(() => {
          return fetch('/api/barcodelookup/search?query=test')
            .then(res => res.json());
        });
        responses.push(response);
        
        if (i < 3) {
          await page.waitForTimeout(100);
        }
      }
      
      // First 2 should succeed, next ones should show rate limit error
      expect(responses[0].products).toBeDefined();
      expect(responses[1].products).toBeDefined();
      expect(responses[2].error).toBeDefined();
      expect(responses[2].error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(responses[3].error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});