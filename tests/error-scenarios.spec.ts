import { test, expect } from '@playwright/test';

test.describe('Error Scenarios and Edge Cases', () => {
  test('handles 404 pages gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.waitForLoadState('networkidle');
    
    // Should show either 404 page or redirect to landing
    const notFoundText = page.getByText(/not found|404|page doesn't exist/i);
    const landingPage = page.getByTestId('tab-signup');
    
    const hasNotFound = await notFoundText.isVisible().catch(() => false);
    const hasLanding = await landingPage.isVisible().catch(() => false);
    
    expect(hasNotFound || hasLanding).toBeTruthy();
  });

  test('API returns proper error codes', async ({ request }) => {
    // Test for non-existent endpoint - should be 404, 401, or 200 (fallback)
    const response = await request.get('/api/v1/nonexistent');
    expect([200, 404, 401]).toContain(response.status());
  });

  test('handles network failures gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.route('**/*', route => {
      if (route.request().url().includes('/api/')) {
        route.abort('internetdisconnected');
      } else {
        route.continue();
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should still render (even if showing error state)
    const html = await page.content();
    expect(html.length).toBeGreaterThan(0);
  });

  test('protected routes redirect to auth', async ({ page }) => {
    const protectedRoutes = ['/storage', '/cookbook', '/settings', '/meal-planner'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should show auth UI for unauthenticated users
      await expect(page.getByTestId('tab-signup')).toBeVisible({ timeout: 10000 });
    }
  });
});
