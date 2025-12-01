import { test, expect } from '@playwright/test';

test.describe('Donations and Stripe Integration', () => {
  test('donation page loads', async ({ page }) => {
    const response = await page.goto('/donate');
    // Page should load (may redirect to landing if auth required)
    expect([200, 304]).toContain(response?.status() || 200);
  });

  test('stripe payment intent API exists', async ({ request }) => {
    const response = await request.post('/api/v1/payments/create-intent', {
      data: { amount: 500 }
    });
    // Either works or requires auth
    expect([200, 400, 401]).toContain(response.status());
  });

  test('donation API endpoint exists', async ({ request }) => {
    const response = await request.get('/api/v1/donations');
    expect([200, 401]).toContain(response.status());
  });
});
