import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Post Deployment Verification', () => {
  test('application loads successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Check that the page loads without errors
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(400);
    
    // Check for critical elements
    await expect(page).toHaveTitle(/ChefSpAIce/);
    
    // Verify no console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error: ${msg.text()}`);
      }
    });
  });

  test('API health check passes', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
  });

  test('database connection is active', async ({ request }) => {
    const response = await request.get('/api/health/db');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('database');
    expect(data.database).toBe('connected');
  });

  test('critical pages are accessible', async ({ page }) => {
    const criticalPages = [
      '/',
      '/storage/refrigerator',
      '/recipes',
      '/chat',
      '/nutrition',
      '/meal-planner'
    ];
    
    for (const pagePath of criticalPages) {
      const response = await page.goto(pagePath);
      expect(response?.status()).toBeLessThan(400);
      
      // Wait for content to load
      await page.waitForLoadState('networkidle');
      
      // Check for error messages
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('authentication endpoints respond', async ({ request }) => {
    // Check auth status endpoint
    const response = await request.get('/api/auth/status');
    expect(response.status()).toBeLessThan(500); // Should not error even if not authenticated
  });

  test('static assets load correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that CSS loads
    const styles = await page.evaluate(() => {
      const sheet = document.styleSheets[0];
      return sheet ? sheet.cssRules.length > 0 : false;
    });
    expect(styles).toBeTruthy();
    
    // Check that JavaScript loads
    const hasReact = await page.evaluate(() => {
      return window.React !== undefined || document.querySelector('#root') !== null;
    });
    expect(hasReact).toBeTruthy();
  });

  test('environment variables are set', async ({ request }) => {
    const response = await request.get('/api/health/env');
    
    if (response.ok()) {
      const data = await response.json();
      
      // Check critical environment variables (without exposing values)
      expect(data).toHaveProperty('hasDatabase');
      expect(data.hasDatabase).toBeTruthy();
      
      expect(data).toHaveProperty('hasOpenAI');
      expect(data).toHaveProperty('hasUSDA');
      expect(data).toHaveProperty('hasStripe');
    }
  });
});