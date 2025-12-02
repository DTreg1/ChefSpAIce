import { test, expect } from "@playwright/test";

test.describe("Theme & UI Interactions", () => {
  test("landing page renders correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for landing page elements
    await expect(
      page.getByRole("heading", { name: "ChefSpAIce" }),
    ).toBeVisible();
  });

  test("theme toggle button exists on landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find theme toggle button
    const themeToggle = page.getByTestId("button-theme-toggle");
    const hasThemeToggle = await themeToggle.isVisible().catch(() => false);

    // Theme toggle should be present
    expect(hasThemeToggle).toBeTruthy();
  });

  test("should toggle between light and dark theme", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const htmlElement = page.locator("html");
    const themeToggle = page.getByTestId("button-theme-toggle");

    if (await themeToggle.isVisible()) {
      const initialTheme = await htmlElement.getAttribute("class");
      const isDarkMode = initialTheme?.includes("dark");

      await themeToggle.click();

      // Wait for theme class to change
      if (isDarkMode) {
        await page.waitForFunction(
          () => !document.documentElement.classList.contains("dark"),
        );
      } else {
        await page.waitForFunction(() =>
          document.documentElement.classList.contains("dark"),
        );
      }

      const newTheme = await htmlElement.getAttribute("class");
      if (isDarkMode) {
        expect(newTheme).not.toContain("dark");
      } else {
        expect(newTheme).toContain("dark");
      }
    }
  });

  test("page has proper semantic structure", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for main content area
    const main = page.locator("main");
    const mainExists = (await main.count()) > 0;
    expect(mainExists).toBeTruthy();
  });
});
