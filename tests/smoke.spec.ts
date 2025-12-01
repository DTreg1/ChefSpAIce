import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Post Deployment Verification', () => {
  test('application loads successfully', async ({ page }) => {
    // Navigate to the application
    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(400);
    
    // Check for critical elements
    await expect(page).toHaveTitle(/ChefSpAIce/);
  });

  test('API health check passes', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
  });

  test('API v1 health check passes', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('landing page renders for unauthenticated users', async ({ page }) => {
    // Reuse page from prior test to avoid browser context issues
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    
    // Wait for main content with selector-based wait
    await page.waitForSelector('[data-testid="tab-signup"], [data-testid="tab-login"]', { timeout: 10000 });
    
    // Should show authentication UI
    await expect(page.getByRole('heading', { name: 'ChefSpAIce' })).toBeVisible();
    await expect(page.getByTestId('tab-signup')).toBeVisible();
  });

  test('authentication endpoints respond', async ({ request }) => {
    // Check auth config endpoint
    const response = await request.get('/api/auth/config-status');
    expect(response.status()).toBeLessThan(500);
  });

  test('static assets load correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that React app renders
    const hasRoot = await page.evaluate(() => {
      return document.querySelector('#root') !== null;
    });
    expect(hasRoot).toBeTruthy();
    
    // Check that stylesheets are loaded (without accessing cssRules which can throw security errors)
    const stylesheetsLoaded = await page.evaluate(() => {
      return document.styleSheets.length > 0;
    });
    expect(stylesheetsLoaded).toBeTruthy();
  });

  test('public pages are accessible', async ({ page }) => {
    // Test each public page individually with proper assertions
    const publicPages = [
      { path: '/', selector: '[data-testid="tab-signup"]' },
      { path: '/about', selector: 'h1, h2' },
      { path: '/privacy', selector: 'h1, h2' },
      { path: '/terms', selector: 'h1, h2' }
    ];
    
    for (const { path, selector } of publicPages) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      
      // Wait for specific content instead of networkidle
      await page.waitForSelector(selector, { timeout: 10000 });
    }
  });

  test('API info endpoint returns data', async ({ request }) => {
    const response = await request.get('/api/v1/info');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Check for actual properties returned by the API
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('supportedVersions');
  });
});
