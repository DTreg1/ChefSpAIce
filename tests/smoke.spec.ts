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
    await page.goto('/');
    
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
    
    // Check that CSS loads
    const styles = await page.evaluate(() => {
      const sheet = document.styleSheets[0];
      return sheet ? sheet.cssRules.length > 0 : false;
    });
    expect(styles).toBeTruthy();
    
    // Check that React app renders
    const hasRoot = await page.evaluate(() => {
      return document.querySelector('#root') !== null;
    });
    expect(hasRoot).toBeTruthy();
  });

  test('public pages are accessible', async ({ page }) => {
    const publicPages = [
      '/',
      '/about',
      '/privacy',
      '/terms'
    ];
    
    for (const pagePath of publicPages) {
      const response = await page.goto(pagePath);
      expect(response?.status()).toBeLessThan(400);
      
      // Wait for content to load
      await page.waitForLoadState('networkidle');
    }
  });

  test('API info endpoint returns data', async ({ request }) => {
    const response = await request.get('/api/v1/info');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('version');
  });
});
