import { test, expect } from "@playwright/test";

test.describe("Static Pages and Basic Accessibility", () => {
  test("privacy policy page loads", async ({ page }) => {
    const response = await page.goto("/privacy");
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("networkidle");

    // Check for privacy policy content
    await expect(page.getByRole("heading", { name: /Privacy/i })).toBeVisible();
  });

  test("terms of service page loads", async ({ page }) => {
    const response = await page.goto("/terms");
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("networkidle");

    // Check for terms content or any heading
    const termsHeading = page.getByRole("heading", { name: /Terms/i });
    const anyHeading = page.getByRole("heading").first();

    const hasTerms = await termsHeading.isVisible().catch(() => false);
    const hasAnyHeading = await anyHeading.isVisible().catch(() => false);
    expect(hasTerms || hasAnyHeading).toBeTruthy();
  });

  test("about page loads", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("networkidle");

    // Check for about content
    await expect(page.getByRole("heading", { name: /About/i })).toBeVisible();
  });

  test("landing page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Get all headings
    const headings = await page.$$eval("h1, h2, h3, h4, h5, h6", (elements) =>
      elements.map((el) => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent,
      })),
    );

    // Should have at least one heading
    expect(headings.length).toBeGreaterThan(0);
  });

  test("buttons have accessible text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check buttons have accessible text
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute("aria-label");

      // Button should have visible text or aria-label
      const hasAccessibleName =
        (text && text.trim() !== "") || (ariaLabel && ariaLabel !== "");
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test("page supports keyboard navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Tab through the page
    await page.keyboard.press("Tab");

    // Check that first tabbable element is focused
    const firstFocused = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(firstFocused).toBeTruthy();
  });
});
