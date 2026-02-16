/**
 * =============================================================================
 * SIGN-OUT NAVIGATION TESTS
 * =============================================================================
 *
 * Tests for sign-out and auth-loss navigation redirects in RootStackNavigator.
 * Authenticated users who sign out should go to Auth screen (not Onboarding),
 * since they already have accounts and don't need to re-onboard.
 *
 * @module __tests__/signout-navigation.test
 */

import * as fs from "fs";
import * as path from "path";

describe("RootStackNavigator sign-out navigation", () => {
  let source: string;

  beforeAll(() => {
    const filePath = path.resolve(
      __dirname,
      "../navigation/RootStackNavigator.tsx",
    );
    source = fs.readFileSync(filePath, "utf-8");
  });

  describe("Sign-out callback redirect", () => {
    it("redirects to Auth on mobile after sign out (not Onboarding)", () => {
      const signOutSection = source.match(
        /setSignOutCallback[\s\S]*?name:\s*["']Auth["']/,
      );
      expect(signOutSection).not.toBeNull();
    });

    it("redirects to Landing on web after sign out", () => {
      const signOutSection = source.match(
        /setSignOutCallback[\s\S]*?isWeb[\s\S]*?name:\s*["']Landing["']/,
      );
      expect(signOutSection).not.toBeNull();
    });
  });

  describe("Auth state loss redirect", () => {
    it("redirects to Auth on mobile when auth state is lost", () => {
      const authLossSection = source.match(
        /wasAuthenticated\s*&&\s*isNowUnauthenticated[\s\S]*?name:\s*["']Auth["']/,
      );
      expect(authLossSection).not.toBeNull();
    });

    it("redirects to Landing on web when auth state is lost", () => {
      const authLossWeb = source.match(
        /wasAuthenticated\s*&&\s*isNowUnauthenticated[\s\S]*?name:\s*["']Landing["']/,
      );
      expect(authLossWeb).not.toBeNull();
    });
  });

  describe("Initial route resolution", () => {
    it("routes unauthenticated mobile users to Auth screen", () => {
      const authRoute = source.match(
        /getInitialRoute[\s\S]*?!isAuthenticated[\s\S]*?return\s+["']Auth["']/,
      );
      expect(authRoute).not.toBeNull();
    });

    it("routes users without active subscription to Subscription screen", () => {
      const subscriptionRoute = source.match(
        /getInitialRoute[\s\S]*?!isActive[\s\S]*?return\s+["']Subscription["']/,
      );
      expect(subscriptionRoute).not.toBeNull();
    });

    it("checks subscription before onboarding in navigation priority", () => {
      const getInitialRouteBody = source.match(
        /getInitialRoute[\s\S]*?return\s+["']Main["']/,
      );
      expect(getInitialRouteBody).not.toBeNull();
      const fnBody = getInitialRouteBody![0];
      const subscriptionIdx = fnBody.indexOf("!isActive");
      const onboardingIdx = fnBody.indexOf("needsOnboarding");
      expect(subscriptionIdx).toBeGreaterThan(-1);
      expect(onboardingIdx).toBeGreaterThan(-1);
      expect(subscriptionIdx).toBeLessThan(onboardingIdx);
    });

    it("routes users who need onboarding to Onboarding screen", () => {
      expect(source).toMatch(/needsOnboarding[\s\S]*?return\s+["']Onboarding["']/);
    });

    it("routes fully authenticated users to Main screen", () => {
      expect(source).toMatch(/getInitialRoute[\s\S]*?return\s+["']Main["']/);
    });
  });
});
