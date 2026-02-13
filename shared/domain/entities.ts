import type { users, authProviders, userSessions } from "@shared/schema";
import type { SubscriptionTier, TierLimits } from "@shared/subscription";

export type User = typeof users.$inferSelect;
export type AuthProvider = typeof authProviders.$inferSelect;
export type Session = typeof userSessions.$inferSelect;

export type AuthProviderType = "email" | "google" | "apple";

export interface Permission {
  tier: SubscriptionTier;
  limits: TierLimits;
  isAdmin: boolean;
}
