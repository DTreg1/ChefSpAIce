/**
 * =============================================================================
 * DRAWER GUEST ACCOUNT TESTS
 * =============================================================================
 *
 * Tests for the drawer's conditional footer button that shows "Sign Up / Sign In"
 * for guest users and "Sign Out" for authenticated users.
 *
 * @module __tests__/drawer-guest-account.test
 */

import * as fs from "fs";
import * as path from "path";

describe("DrawerContent guest account button", () => {
  let source: string;

  beforeAll(() => {
    const filePath = path.resolve(
      __dirname,
      "../components/DrawerContent.tsx",
    );
    source = fs.readFileSync(filePath, "utf-8");
  });

  describe("Conditional rendering", () => {
    it("checks isAuthenticated to decide which footer button to show", () => {
      expect(source).toMatch(/isAuthenticated\s*\?/);
    });

    it("shows Sign Out button for authenticated users", () => {
      expect(source).toMatch(/Sign Out/);
    });

    it("shows Sign Up / Sign In button for guest users", () => {
      expect(source).toMatch(/Sign Up \/ Sign In/);
    });
  });

  describe("Guest sign-up button", () => {
    it("has a create-account test ID", () => {
      expect(source).toMatch(/button-drawer-create-account/);
    });

    it("navigates to Auth screen on press", () => {
      expect(source).toMatch(/navigate\(\s*["']Auth["']/);
    });

    it("uses user-plus icon for the guest button", () => {
      expect(source).toMatch(/name=["']user-plus["']/);
    });
  });

  describe("Authenticated sign-out button", () => {
    it("has a sign-out test ID", () => {
      expect(source).toMatch(/button-drawer-sign-out/);
    });

    it("calls signOut on press", () => {
      expect(source).toMatch(/signOut\(\)/);
    });

    it("uses log-out icon for the authenticated button", () => {
      expect(source).toMatch(/name=["']log-out["']/);
    });
  });

  describe("No separate create account card", () => {
    it("does not have a standalone drawer-create-account data-testid outside the footer", () => {
      // The old implementation had a separate card with data-testid="drawer-create-account" 
      // in the body of the drawer. Now it should only exist as the footer button.
      const matches = source.match(/drawer-create-account/g);
      // Should only appear once (in the footer button testID)
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(1);
    });
  });
});
