/**
 * =============================================================================
 * ONBOARDING WELCOME STEP TESTS
 * =============================================================================
 *
 * Tests for the guest-first onboarding flow that starts with a welcome screen
 * before the preferences step. Verifies step order, welcome step content,
 * and saved step resume support.
 *
 * @module __tests__/onboarding-welcome-step.test
 */

import * as fs from "fs";
import * as path from "path";

describe("Onboarding welcome step", () => {
  let source: string;

  beforeAll(() => {
    const filePath = path.resolve(
      __dirname,
      "../screens/OnboardingScreen.tsx",
    );
    source = fs.readFileSync(filePath, "utf-8");
  });

  describe("Step type definition", () => {
    it("includes 'welcome' in OnboardingStep type union", () => {
      expect(source).toMatch(/type\s+OnboardingStep[\s\S]*?\|\s*["']welcome["']/);
    });

    it("welcome is listed before preferences in the type union", () => {
      const welcomeIndex = source.indexOf('"welcome"');
      const preferencesIndex = source.indexOf('"preferences"');
      expect(welcomeIndex).toBeGreaterThan(-1);
      expect(preferencesIndex).toBeGreaterThan(-1);
      expect(welcomeIndex).toBeLessThan(preferencesIndex);
    });
  });

  describe("Default step state", () => {
    it("initializes step state to 'welcome' instead of 'preferences'", () => {
      expect(source).toMatch(
        /useState<OnboardingStep>\(\s*["']welcome["']\s*\)/,
      );
    });
  });

  describe("Saved step validation", () => {
    it("includes 'welcome' in the saved step validation array", () => {
      // The validation check should include "welcome" in the array of valid steps
      expect(source).toMatch(
        /\[\s*["']welcome["']\s*,\s*["']preferences["']/,
      );
    });
  });

  describe("Welcome step rendering", () => {
    it("renders welcome step conditionally", () => {
      expect(source).toMatch(/step\s*===\s*["']welcome["']\s*&&\s*renderWelcomeStep/);
    });

    it("renders welcome step before preferences step in the JSX", () => {
      const welcomeRenderIndex = source.indexOf('step === "welcome"');
      const preferencesRenderIndex = source.indexOf('step === "preferences"');
      expect(welcomeRenderIndex).toBeGreaterThan(-1);
      expect(preferencesRenderIndex).toBeGreaterThan(-1);
      expect(welcomeRenderIndex).toBeLessThan(preferencesRenderIndex);
    });

    it("has a data-testid for the welcome step", () => {
      expect(source).toMatch(/data-testid\s*=\s*["']onboarding-welcome-step["']/);
    });

    it("has a Get Started button with data-testid", () => {
      expect(source).toMatch(/data-testid\s*=\s*["']button-get-started["']/);
    });
  });

  describe("Welcome step navigation", () => {
    it("has a handler to navigate from welcome to preferences", () => {
      expect(source).toMatch(
        /handleWelcomeToPreferences[\s\S]*?setStep\(\s*["']preferences["']\s*\)/,
      );
    });

    it("has a handler to navigate back from preferences to welcome", () => {
      expect(source).toMatch(
        /handleBackToWelcome[\s\S]*?setStep\(\s*["']welcome["']\s*\)/,
      );
    });
  });

  describe("Complete step flow ordering", () => {
    it("maintains the full step rendering order: welcome, preferences, storage, foods, cookware, complete", () => {
      const steps = ["welcome", "preferences", "storage", "foods", "cookware", "complete"];
      let lastIndex = -1;
      for (const step of steps) {
        const pattern = `step === "${step}"`;
        const index = source.indexOf(pattern);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    });
  });
});
