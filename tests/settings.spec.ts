import { test, expect } from "@playwright/test";

test.describe("Settings & User Profile Management", () => {
  test("settings page redirects unauthenticated users", async ({ page }) => {
    // Navigate to settings - should redirect to landing page for unauthenticated users
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Should see landing/auth page
    await expect(page.getByTestId("tab-signup")).toBeVisible({
      timeout: 10000,
    });
  });

  test("preferences API endpoint exists", async ({ request }) => {
    const response = await request.get("/api/v1/preferences");
    // Either requires auth (401) or returns data (200)
    expect([200, 401]).toContain(response.status());
  });

  test("storage locations API endpoint exists", async ({ request }) => {
    const response = await request.get("/api/v1/storage-locations");
    // Either requires auth (401) or returns data (200)
    expect([200, 401]).toContain(response.status());
  });

  test("user profile API returns 401 for unauthenticated users", async ({
    request,
  }) => {
    const response = await request.get("/api/auth/user");
    expect(response.status()).toBe(401);
  });

  test("logout endpoint exists", async ({ request }) => {
    const response = await request.post("/api/auth/logout");
    // Should either succeed or require auth
    expect([200, 302, 401]).toContain(response.status());
  });
});
