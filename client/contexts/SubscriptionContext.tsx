/**
 * =============================================================================
 * SUBSCRIPTION CONTEXT - Re-export for backward compatibility
 * =============================================================================
 * 
 * This file re-exports the subscription context from the hooks file.
 * The main implementation is in client/hooks/useSubscription.tsx
 */

export {
  SubscriptionProvider,
  useSubscription,
  SubscriptionContext,
  SubscriptionTier,
  type SubscriptionContextValue,
  type SubscriptionData,
  type SubscriptionStatus,
  type Entitlements,
  type Usage,
  type LimitCheckResult,
} from "../hooks/useSubscription";
