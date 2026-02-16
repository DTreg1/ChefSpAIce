/**
 * =============================================================================
 * DRAWER NAVIGATION PARAMS TESTS
 * =============================================================================
 *
 * Regression tests for the bug where tapping "Profile" in the drawer navigated
 * to ProfileTab without specifying the nested screen, so a stale Settings
 * screen remained visible instead of showing the Profile screen.
 *
 * THE BUG:
 * - Profile drawer item called: navigation.navigate("Tabs", { screen: "ProfileTab" })
 * - Without params: { screen: "Profile" }, React Navigation kept the previous
 *   nested screen (e.g., Settings) visible
 *
 * THE FIX:
 * - All ProfileTab navigations now include params with the target screen:
 *   navigation.navigate("Tabs", { screen: "ProfileTab", params: { screen: "Profile" } })
 *
 * @module __tests__/drawer-navigation-params.test
 */

import * as fs from "fs";
import * as path from "path";

describe("DrawerContent navigation params", () => {
  let drawerSource: string;

  beforeAll(() => {
    const drawerPath = path.resolve(
      __dirname,
      "../components/DrawerContent.tsx",
    );
    drawerSource = fs.readFileSync(drawerPath, "utf-8");
  });

  it("Profile drawer item navigates with params: { screen: \"Profile\" }", () => {
    const profileNavPattern =
      /navigation\.navigate\(\s*["']Tabs["']\s*,\s*\{[^}]*screen:\s*["']ProfileTab["'][^}]*params:\s*\{\s*screen:\s*["']Profile["']\s*\}/s;
    expect(drawerSource).toMatch(profileNavPattern);
  });

  it("Settings drawer item navigates with params: { screen: \"Settings\" }", () => {
    const settingsNavPattern =
      /navigation\.navigate\(\s*["']Tabs["']\s*,\s*\{[^}]*screen:\s*["']ProfileTab["'][^}]*params:\s*\{\s*screen:\s*["']Settings["']\s*\}/s;
    expect(drawerSource).toMatch(settingsNavPattern);
  });

  it("Analytics drawer item navigates with params: { screen: \"Analytics\" }", () => {
    const analyticsNavPattern =
      /navigation\.navigate\(\s*["']Tabs["']\s*,\s*\{[^}]*screen:\s*["']ProfileTab["'][^}]*params:\s*\{\s*screen:\s*["']Analytics["']\s*\}/s;
    expect(drawerSource).toMatch(analyticsNavPattern);
  });

  it("every ProfileTab navigation includes a params property with screen", () => {
    const allProfileTabNavs = drawerSource.match(
      /navigation\.navigate\(\s*["']Tabs["']\s*,\s*\{[^)]*screen:\s*["']ProfileTab["'][^)]*\}/gs,
    );

    expect(allProfileTabNavs).not.toBeNull();
    expect(allProfileTabNavs!.length).toBeGreaterThan(0);

    for (const nav of allProfileTabNavs!) {
      expect(nav).toMatch(/params:\s*\{\s*screen:/);
    }
  });

  it("no bare ProfileTab navigation without params exists", () => {
    const lines = drawerSource.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes('screen: "ProfileTab"') ||
        line.includes("screen: 'ProfileTab'")
      ) {
        const surroundingLines = lines.slice(i, i + 3).join(" ");
        expect(surroundingLines).toMatch(/params:\s*\{/);
      }
    }
  });

  it("ShoppingList navigation uses params for MealPlanTab", () => {
    const shoppingNavPattern =
      /navigation\.navigate\(\s*["']Tabs["']\s*,\s*\{[^}]*screen:\s*["']MealPlanTab["'][^}]*params:\s*\{\s*screen:\s*["']ShoppingList["']\s*\}/s;
    expect(drawerSource).toMatch(shoppingNavPattern);
  });
});
