import { test, expect } from '@playwright/test';

test.describe('Appliances Management', () => {
  test('appliances page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/appliances');
    await page.waitForLoadState('networkidle');
    
    // Should see auth UI for unauthenticated users
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('appliances API endpoint exists', async ({ request }) => {
    const response = await request.get('/api/v1/appliances');
    // Either requires auth (401) or returns data (200)
    expect([200, 401]).toContain(response.status());
  });

  test('appliance library API exists', async ({ request }) => {
    const response = await request.get('/api/v1/appliance-library');
    // Either returns data or requires auth
    expect([200, 401]).toContain(response.status());
  });

  test('create appliance endpoint exists', async ({ request }) => {
    const response = await request.post('/api/v1/appliances', {
      data: { name: 'Test Appliance', brand: 'Test Brand' }
    });
    // Either requires auth (401) or validates input (400) or succeeds (200/201)
    expect([200, 201, 400, 401]).toContain(response.status());
  });
});
