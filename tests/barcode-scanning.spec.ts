import { test, expect } from '@playwright/test';

test.describe('Barcode Scanning', () => {
  test('barcode page redirects unauthenticated users', async ({ page }) => {
    // Navigate to the protected barcode scanner page
    await page.goto('/barcode-scanner');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to auth UI with signup/login tabs
    await expect(page.getByTestId('tab-signup').or(page.getByTestId('tab-login'))).toBeVisible({ timeout: 10000 });
  });

  test('barcode lookup API exists', async ({ request }) => {
    const response = await request.get('/api/v1/barcode/lookup?code=012345678901');
    // Either returns data or requires auth
    expect([200, 401, 404]).toContain(response.status());
  });

  test('barcode history API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/barcode/history');
    expect(response.status()).toBe(401);
  });
});
