import { Alert } from "react-native";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { SubscriptionTier } from "@shared/subscription";
import { logger } from "@/lib/logger";

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

export async function handleStripeWebCheckout(params: StripeWebCheckoutParams): Promise<void> {
  const { plan, tier, currentStatus, currentTier, refetch, setIsCheckingOut, setIsPreviewingProration, setProrationPreview } = params;
  const tierName = "ChefSpAIce";

  const prices = await apiClient.get<Record<string, { id: string }>>("/api/subscriptions/prices", { skipAuth: true });
  const priceKey = plan === "monthly" ? "standardMonthly" : "standardAnnual";
  const fallbackKey = plan === "monthly" ? "monthly" : "annual";
  const selectedPriceId = prices[priceKey]?.id || prices[fallbackKey]?.id;

  if (!selectedPriceId) {
    Alert.alert(
      "Price Not Available",
      `The ${tierName} ${plan} subscription pricing is not yet configured. Please contact support or try a different option.`,
      [{ text: "OK" }],
    );
    return;
  }

  const isExistingPaidSubscriber =
    currentStatus === "active" &&
    currentTier === SubscriptionTier.STANDARD;

  if (isExistingPaidSubscriber) {
    setIsPreviewingProration(true);
    try {
      const preview = await apiClient.post<{ immediatePayment: number; currency: string }>(
        "/api/subscriptions/preview-proration",
        { newPriceId: selectedPriceId },
      );
      setProrationPreview({ proratedAmount: preview.immediatePayment, creditAmount: 0, newAmount: preview.immediatePayment, currency: preview.currency });

      const formattedAmount = (preview.immediatePayment / 100).toFixed(2);
      const currencySymbol = preview.currency === "usd" ? "$" : preview.currency.toUpperCase() + " ";

      Alert.alert(
        "Confirm Plan Change",
        `You'll be charged ${currencySymbol}${formattedAmount} now (prorated for the remaining billing period). Your new plan starts immediately.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm Upgrade",
            onPress: async () => {
              try {
                setIsCheckingOut(true);
                const upgradeData = await apiClient.post<{ upgraded: boolean }>(
                  "/api/subscriptions/upgrade",
                  {
                    priceId: selectedPriceId,
                    billingPeriod: plan,
                  },
                );

                if (upgradeData.upgraded) {
                  await refetch();
                  Alert.alert("Success", `Your plan has been upgraded to ${tierName}!`);
                }
              } catch (err) {
                logger.error("Error upgrading subscription:", err);
                const errorMsg = err instanceof ApiClientError ? err.message : "Something went wrong during upgrade.";
                Alert.alert("Error", errorMsg);
              } finally {
                setIsCheckingOut(false);
              }
            },
          },
        ],
      );
    } catch (err) {
      logger.error("Error previewing proration:", err);
      const errorMsg = err instanceof ApiClientError ? err.message : "Failed to preview plan change. Please try again.";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsPreviewingProration(false);
    }
    return;
  }

  try {
    const data = await apiClient.post<{ url?: string }>(
      "/api/subscriptions/create-checkout-session",
      {
        priceId: selectedPriceId,
        tier,
        successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/subscription-canceled`,
      },
    );

    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    const errorMsg = err instanceof ApiClientError ? err.message : "Failed to start checkout. Please try again.";
    Alert.alert("Error", errorMsg);
  }
}
