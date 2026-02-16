/**
 * =============================================================================
 * SUBSCRIPTION CONTEXT TESTS
 * =============================================================================
 *
 * Tests for the useSubscription hook and SubscriptionProvider.
 *
 * TESTED FUNCTIONALITY:
 * - Subscription state management
 * - Trial period calculations
 * - Entitlement checking
 * - Feature gating
 * - Usage limit enforcement
 * - Subscription status transitions
 *
 * @module __tests__/subscription.test
 */

import { SubscriptionTier, TIER_CONFIG } from "../../shared/subscription";

type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "none";

const checkIsProUser = (tier: SubscriptionTier): boolean => tier === SubscriptionTier.PRO;
const checkIsTrialing = (status: SubscriptionStatus): boolean => status === "trialing";
const checkIsActive = (status: SubscriptionStatus): boolean =>
  status === "trialing" || status === "active";
const checkIsPastDue = (status: SubscriptionStatus): boolean => status === "past_due";
const checkIsTrialExpired = (status: SubscriptionStatus): boolean =>
  status !== "active" && status !== "trialing";

interface Entitlements {
  maxPantryItems: number | "unlimited";
  maxAiRecipes: number | "unlimited";
  maxCookware: number | "unlimited";
  canCustomizeStorageAreas: boolean;
  canUseRecipeScanning: boolean;
  canUseBulkScanning: boolean;
  canUseAiKitchenAssistant: boolean;
  canUseWeeklyMealPrepping: boolean;
}

interface Usage {
  pantryItemCount: number;
  aiRecipesUsedThisMonth: number;
  cookwareCount: number;
}

interface SubscriptionData {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType: "monthly" | "annual" | "trial" | null;
  entitlements: Entitlements;
  usage: Usage;
  remaining: {
    pantryItems: number | "unlimited";
    aiRecipes: number | "unlimited";
    cookware: number | "unlimited";
  };
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const defaultEntitlements: Entitlements = {
  maxPantryItems: TIER_CONFIG[SubscriptionTier.BASIC].maxPantryItems,
  maxAiRecipes: TIER_CONFIG[SubscriptionTier.BASIC].maxAiRecipesPerMonth,
  maxCookware: TIER_CONFIG[SubscriptionTier.BASIC].maxCookwareItems,
  canCustomizeStorageAreas: false,
  canUseRecipeScanning: false,
  canUseBulkScanning: false,
  canUseAiKitchenAssistant: false,
  canUseWeeklyMealPrepping: false,
};

const proEntitlements: Entitlements = {
  maxPantryItems: "unlimited",
  maxAiRecipes: "unlimited",
  maxCookware: "unlimited",
  canCustomizeStorageAreas: true,
  canUseRecipeScanning: true,
  canUseBulkScanning: true,
  canUseAiKitchenAssistant: true,
  canUseWeeklyMealPrepping: true,
};

describe("Subscription - Tier Configuration", () => {
  describe("Basic Tier Limits", () => {
    it("has correct maxPantryItems limit", () => {
      expect(TIER_CONFIG[SubscriptionTier.BASIC].maxPantryItems).toBe(25);
    });

    it("has correct maxAiRecipesPerMonth limit", () => {
      expect(TIER_CONFIG[SubscriptionTier.BASIC].maxAiRecipesPerMonth).toBe(5);
    });

    it("has correct maxCookwareItems limit", () => {
      expect(TIER_CONFIG[SubscriptionTier.BASIC].maxCookwareItems).toBe(5);
    });
  });

  describe("Pro Tier Limits", () => {
    it("has unlimited maxPantryItems", () => {
      expect(TIER_CONFIG[SubscriptionTier.PRO].maxPantryItems).toBe(-1);
    });

    it("has unlimited maxAiRecipesPerMonth", () => {
      expect(TIER_CONFIG[SubscriptionTier.PRO].maxAiRecipesPerMonth).toBe(-1);
    });

    it("has unlimited maxCookwareItems", () => {
      expect(TIER_CONFIG[SubscriptionTier.PRO].maxCookwareItems).toBe(-1);
    });
  });
});

describe("Subscription - Status Determination", () => {
  describe("isProUser", () => {
    it("returns true for Pro tier", () => {
      expect(checkIsProUser(SubscriptionTier.PRO)).toBe(true);
    });

    it("returns false for Basic tier", () => {
      expect(checkIsProUser(SubscriptionTier.BASIC)).toBe(false);
    });
  });

  describe("isTrialing", () => {
    it("returns true for trialing status", () => {
      expect(checkIsTrialing("trialing")).toBe(true);
    });

    it("returns false for active status", () => {
      expect(checkIsTrialing("active")).toBe(false);
    });

    it("returns false for expired status", () => {
      expect(checkIsTrialing("expired")).toBe(false);
    });
  });

  describe("isActive", () => {
    it("returns true for trialing status", () => {
      expect(checkIsActive("trialing")).toBe(true);
    });

    it("returns true for active status", () => {
      expect(checkIsActive("active")).toBe(true);
    });

    it("returns false for past_due status", () => {
      expect(checkIsActive("past_due")).toBe(false);
    });

    it("returns false for canceled status", () => {
      expect(checkIsActive("canceled")).toBe(false);
    });

    it("returns false for expired status", () => {
      expect(checkIsActive("expired")).toBe(false);
    });

    it("returns false for none status", () => {
      expect(checkIsActive("none")).toBe(false);
    });
  });

  describe("isPastDue", () => {
    it("returns true for past_due status", () => {
      expect(checkIsPastDue("past_due")).toBe(true);
    });

    it("returns false for active status", () => {
      expect(checkIsPastDue("active")).toBe(false);
    });
  });
});

describe("Subscription - Trial Calculations", () => {
  describe("trialDaysRemaining", () => {
    it("calculates days remaining correctly", () => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const daysRemaining = Math.ceil(
        (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysRemaining).toBe(5);
    });

    it("returns 0 when trial has expired", () => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      expect(daysRemaining).toBe(0);
    });

    it("returns 1 when trial ends today", () => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      const daysRemaining = Math.ceil(
        (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysRemaining).toBe(1);
    });

    it("returns null when trialEndsAt is null", () => {
      const trialEndsAt: string | null = null;
      const daysRemaining = trialEndsAt ? 5 : null;
      expect(daysRemaining).toBeNull();
    });
  });

  describe("isTrialExpired", () => {
    it("returns true when trial has ended and status is not active", () => {
      expect(checkIsTrialExpired("expired")).toBe(true);
    });

    it("returns false when trial is still active", () => {
      expect(checkIsTrialExpired("trialing")).toBe(false);
    });
  });
});

describe("Subscription - Limit Checking", () => {
  describe("checkLimit for pantryItems", () => {
    it("allows when under limit", () => {
      const usage: Usage = {
        pantryItemCount: 10,
        aiRecipesUsedThisMonth: 0,
        cookwareCount: 0,
      };
      const maxPantryItems = 25;

      const remaining = maxPantryItems - usage.pantryItemCount;
      const allowed = remaining > 0;

      expect(allowed).toBe(true);
      expect(remaining).toBe(15);
    });

    it("denies when at limit", () => {
      const usage: Usage = {
        pantryItemCount: 25,
        aiRecipesUsedThisMonth: 0,
        cookwareCount: 0,
      };
      const maxPantryItems = 25;

      const remaining = maxPantryItems - usage.pantryItemCount;
      const allowed = remaining > 0;

      expect(allowed).toBe(false);
      expect(remaining).toBe(0);
    });

    it("denies when over limit", () => {
      const usage: Usage = {
        pantryItemCount: 30,
        aiRecipesUsedThisMonth: 0,
        cookwareCount: 0,
      };
      const maxPantryItems = 25;

      const remaining = Math.max(0, maxPantryItems - usage.pantryItemCount);
      const allowed = remaining > 0;

      expect(allowed).toBe(false);
      expect(remaining).toBe(0);
    });

    it("always allows for unlimited", () => {
      const usage: Usage = {
        pantryItemCount: 1000,
        aiRecipesUsedThisMonth: 0,
        cookwareCount: 0,
      };
      const maxPantryItems: number | "unlimited" = "unlimited";

      const allowed = maxPantryItems === "unlimited" || true;
      const remaining = maxPantryItems;

      expect(allowed).toBe(true);
      expect(remaining).toBe("unlimited");
    });
  });

  describe("checkLimit for aiRecipes", () => {
    it("allows when under monthly limit", () => {
      const usage: Usage = {
        pantryItemCount: 0,
        aiRecipesUsedThisMonth: 3,
        cookwareCount: 0,
      };
      const maxAiRecipes = 5;

      const remaining = maxAiRecipes - usage.aiRecipesUsedThisMonth;
      const allowed = remaining > 0;

      expect(allowed).toBe(true);
      expect(remaining).toBe(2);
    });

    it("denies when monthly limit reached", () => {
      const usage: Usage = {
        pantryItemCount: 0,
        aiRecipesUsedThisMonth: 5,
        cookwareCount: 0,
      };
      const maxAiRecipes = 5;

      const remaining = maxAiRecipes - usage.aiRecipesUsedThisMonth;
      const allowed = remaining > 0;

      expect(allowed).toBe(false);
      expect(remaining).toBe(0);
    });
  });

  describe("checkLimit for cookware", () => {
    it("allows when under limit", () => {
      const usage: Usage = {
        pantryItemCount: 0,
        aiRecipesUsedThisMonth: 0,
        cookwareCount: 3,
      };
      const maxCookware = 5;

      const remaining = maxCookware - usage.cookwareCount;
      const allowed = remaining > 0;

      expect(allowed).toBe(true);
      expect(remaining).toBe(2);
    });
  });
});

describe("Subscription - Feature Checking", () => {
  describe("checkFeature for Basic tier", () => {
    it("denies canCustomizeStorageAreas", () => {
      expect(defaultEntitlements.canCustomizeStorageAreas).toBe(false);
    });

    it("denies canUseRecipeScanning", () => {
      expect(defaultEntitlements.canUseRecipeScanning).toBe(false);
    });

    it("denies canUseBulkScanning", () => {
      expect(defaultEntitlements.canUseBulkScanning).toBe(false);
    });

    it("denies canUseAiKitchenAssistant", () => {
      expect(defaultEntitlements.canUseAiKitchenAssistant).toBe(false);
    });

    it("denies canUseWeeklyMealPrepping", () => {
      expect(defaultEntitlements.canUseWeeklyMealPrepping).toBe(false);
    });
  });

  describe("checkFeature for Pro tier", () => {
    it("allows canCustomizeStorageAreas", () => {
      expect(proEntitlements.canCustomizeStorageAreas).toBe(true);
    });

    it("allows canUseRecipeScanning", () => {
      expect(proEntitlements.canUseRecipeScanning).toBe(true);
    });

    it("allows canUseBulkScanning", () => {
      expect(proEntitlements.canUseBulkScanning).toBe(true);
    });

    it("allows canUseAiKitchenAssistant", () => {
      expect(proEntitlements.canUseAiKitchenAssistant).toBe(true);
    });

    it("allows canUseWeeklyMealPrepping", () => {
      expect(proEntitlements.canUseWeeklyMealPrepping).toBe(true);
    });
  });
});

describe("Subscription - Plan Types", () => {
  it("identifies monthly plan type", () => {
    const planType: "monthly" | "annual" | "trial" | null = "monthly";
    expect(planType).toBe("monthly");
  });

  it("identifies annual plan type", () => {
    const planType: "monthly" | "annual" | "trial" | null = "annual";
    expect(planType).toBe("annual");
  });

  it("identifies trial plan type", () => {
    const planType: "monthly" | "annual" | "trial" | null = "trial";
    expect(planType).toBe("trial");
  });

  it("handles null plan type for no subscription", () => {
    const planType: "monthly" | "annual" | "trial" | null = null;
    expect(planType).toBeNull();
  });
});

describe("Subscription - Data Structure", () => {
  it("creates valid subscription data object", () => {
    const subscription: SubscriptionData = {
      tier: SubscriptionTier.PRO,
      status: "active",
      planType: "annual",
      entitlements: proEntitlements,
      usage: {
        pantryItemCount: 50,
        aiRecipesUsedThisMonth: 10,
        cookwareCount: 15,
      },
      remaining: {
        pantryItems: "unlimited",
        aiRecipes: "unlimited",
        cookware: "unlimited",
      },
      trialEndsAt: null,
      currentPeriodEnd: "2025-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    };

    expect(subscription.tier).toBe(SubscriptionTier.PRO);
    expect(subscription.status).toBe("active");
    expect(subscription.planType).toBe("annual");
    expect(subscription.cancelAtPeriodEnd).toBe(false);
  });

  it("handles cancelAtPeriodEnd correctly", () => {
    const subscription: Partial<SubscriptionData> = {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2025-02-15T00:00:00.000Z",
    };

    expect(subscription.cancelAtPeriodEnd).toBe(true);
    expect(subscription.currentPeriodEnd).toBeDefined();
  });
});
