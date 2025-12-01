import { test, expect } from '@playwright/test';

test.describe('Food Inventory Management', () => {
  test('storage page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/storage/refrigerator');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to landing page
    await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
  });

  test('inventory API returns 401 for unauthenticated users', async ({ request }) => {
    const response = await request.get('/api/v1/inventory');
    expect(response.status()).toBe(401);
  });

  test('food items API returns 401 for unauthenticated users', async ({ request }) => {
    const response = await request.get('/api/v1/food-items');
    expect(response.status()).toBe(401);
  });

  test('storage locations API endpoint exists', async ({ request }) => {
    const response = await request.get('/api/v1/storage-locations');
    // Should return 401 (needs auth) - not 404
    expect(response.status()).toBe(401);
  });

  test('inventory endpoints are properly protected', async ({ request }) => {
    // Test POST endpoint
    const postResponse = await request.post('/api/v1/food-items', {
      data: {
        name: 'Test Item',
        quantity: 1,
        unit: 'count',
        storageLocation: 'refrigerator'
      }
    });
    expect(postResponse.status()).toBe(401);
  });
});
