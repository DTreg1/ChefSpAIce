import { test, expect } from '@playwright/test';

test.describe('Appliances Management', () => {
  test('appliances page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/appliances');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('appliances API requires authentication', async ({ request }) => {
    const response = await request.get('/api/v1/appliances');
    expect(response.status()).toBe(401);
  });

  test('appliance library API exists', async ({ request }) => {
    const response = await request.get('/api/v1/appliance-library');
    // Either returns data or requires auth
    expect([200, 401]).toContain(response.status());
  });

  test('create appliance requires authentication', async ({ request }) => {
    const response = await request.post('/api/v1/appliances', {
      data: { name: 'Test Appliance', brand: 'Test Brand' }
    });
    expect(response.status()).toBe(401);
  });
});
