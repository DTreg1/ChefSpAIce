import { SubscriptionTier } from "@shared/subscription";

interface StripeWebCheckoutParams {
  plan: "monthly" | "annual";
  tier: "standard";
  currentStatus: string;
  currentTier: SubscriptionTier;
  refetch: () => Promise<void>;
  setIsCheckingOut: (v: boolean) => void;
  setIsPreviewingProration: (v: boolean) => void;
  setProrationPreview: (v: { proratedAmount: number; creditAmount: number; newAmount: number; currency: string } | null) => void;
}

export async function handleStripeWebCheckout(_params: StripeWebCheckoutParams): Promise<void> {
}
