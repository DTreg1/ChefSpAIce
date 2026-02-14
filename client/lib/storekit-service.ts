import { Platform } from "react-native";
import { apiClient } from "@/lib/api-client";
import Purchases, {
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { storage } from "@/lib/storage";
import { logger } from "@/lib/logger";

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";
const REVENUECAT_ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";
const REVENUECAT_TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY || "";

export const ENTITLEMENTS = {
  STANDARD: "standard",
  PRO: "standard",
} as const;

export type PaywallResult =
  | "purchased"
  | "restored"
  | "cancelled"
  | "error"
  | "not_presented";

class StoreKitService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private authToken: string | null = null;

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  async syncPurchaseWithServer(customerInfo: CustomerInfo): Promise<boolean> {
    // If not authenticated, save purchase for later sync
    if (!this.authToken) {
      logger.log("StoreKit: No auth token, saving purchase for later sync");
      try {
        await storage.savePendingPurchase(customerInfo);
        logger.log("StoreKit: Pending purchase saved successfully");
        return true; // Return true because purchase is valid, just pending server sync
      } catch (error) {
        logger.error("StoreKit: Failed to save pending purchase", error);
        return false;
      }
    }

    try {
      let tier: "STANDARD" = "STANDARD";
      let status: string = "active";

      if (customerInfo.entitlements.active[ENTITLEMENTS.STANDARD]) {
        const entitlement = customerInfo.entitlements.active[ENTITLEMENTS.STANDARD];
        if (entitlement.periodType === "TRIAL") {
          status = "active";
        }
      } else {
        status = "expired";
      }

      const activeEntitlement =
        customerInfo.entitlements.active[ENTITLEMENTS.STANDARD];
      const expirationDate = activeEntitlement?.expirationDate || null;

      try {
        await apiClient.post<void>("/api/subscriptions/sync-revenuecat", {
          tier,
          status,
          productId: activeEntitlement?.productIdentifier || null,
          expirationDate,
        });
        logger.log("StoreKit: Purchase synced with server successfully");
        await storage.clearPendingPurchase();
        return true;
      } catch (syncError) {
        logger.error(
          "StoreKit: Failed to sync purchase with server",
          syncError,
        );
        return false;
      }
    } catch (error) {
      logger.error("StoreKit: Error syncing purchase with server", error);
      return false;
    }
  }

  /**
   * Sync any pending purchases after user logs in
   * Call this after successful authentication
   */
  async syncPendingPurchases(): Promise<boolean> {
    if (!this.authToken) {
      logger.warn(
        "StoreKit: Cannot sync pending purchases without auth token",
      );
      return false;
    }

    try {
      const pending = await storage.getPendingPurchase();
      if (!pending) {
        logger.log("StoreKit: No pending purchases to sync");
        return true;
      }

      logger.log("StoreKit: Found pending purchase, syncing...");

      // Get fresh customer info from RevenueCat (more reliable than stored data)
      const customerInfo = await this.getCustomerInfo();
      if (customerInfo) {
        const success = await this.syncPurchaseWithServer(customerInfo);
        if (success) {
          logger.log("StoreKit: Pending purchase synced successfully");
          return true;
        }
      }

      // Fall back to stored customer info if fresh fetch fails
      const storedCustomerInfo = pending.customerInfo as CustomerInfo;
      if (storedCustomerInfo) {
        // Temporarily allow sync even with stored data
        const success = await this.syncPurchaseWithServer(storedCustomerInfo);
        if (success) {
          logger.log("StoreKit: Pending purchase synced from stored data");
          return true;
        }
      }

      logger.warn("StoreKit: Failed to sync pending purchase");
      return false;
    } catch (error) {
      logger.error("StoreKit: Error syncing pending purchases", error);
      return false;
    }
  }

  /**
   * Check if there are any pending purchases that need syncing
   */
  async hasPendingPurchase(): Promise<boolean> {
    const pending = await storage.getPendingPurchase();
    return pending !== null;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    if (Platform.OS === "web") return;

    this.initPromise = (async () => {
      try {
        // Set verbose logging in development
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }

        // Try platform-specific key first
        let apiKey = Platform.select({
          ios: REVENUECAT_IOS_KEY,
          android: REVENUECAT_ANDROID_KEY,
          default: "",
        });

        // Try to configure with the production key first
        if (apiKey) {
          try {
            logger.log(
              "StoreKit: Configuring with production API key for",
              Platform.OS,
            );
            await Purchases.configure({ apiKey });
            this.initialized = true;
            logger.log(
              "StoreKit: Initialized successfully with production key",
            );
            return;
          } catch (error: unknown) {
            const errorMessage = (error as Error)?.message || "";
            // If it fails due to Expo Go, try the test key
            if (
              errorMessage.includes("Expo Go") ||
              errorMessage.includes("Test Store")
            ) {
              logger.log("StoreKit: Production key failed, trying test key...");
            } else {
              throw error;
            }
          }
        }

        // Fall back to test key (for Expo Go)
        if (REVENUECAT_TEST_KEY) {
          logger.log("StoreKit: Configuring with Test Store API key");
          await Purchases.configure({ apiKey: REVENUECAT_TEST_KEY });
          this.initialized = true;
          logger.log(
            "StoreKit: Initialized successfully with test key (Expo Go mode)",
          );
          return;
        }

        logger.warn("StoreKit: No valid API key available");
      } catch (error) {
        logger.error("StoreKit: Failed to initialize", error);
      }
    })();

    return this.initPromise;
  }

  async setUserId(userId: string): Promise<void> {
    if (Platform.OS === "web") return;

    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) return;

    try {
      await Purchases.logIn(userId);
      logger.log("StoreKit: User ID set", userId);
    } catch (error) {
      logger.error("StoreKit: Failed to set user ID", error);
    }
  }

  async logout(): Promise<void> {
    if (!this.initialized || Platform.OS === "web") return;

    try {
      await Purchases.logOut();
      logger.log("StoreKit: User logged out");
    } catch (error) {
      logger.error("StoreKit: Failed to logout", error);
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    if (!this.initialized || Platform.OS === "web") return null;

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      logger.error("StoreKit: Failed to get offerings", error);
      return null;
    }
  }

  async getAllOfferings(): Promise<Record<string, PurchasesOffering> | null> {
    if (!this.initialized || Platform.OS === "web") return null;

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.all;
    } catch (error) {
      logger.error("StoreKit: Failed to get all offerings", error);
      return null;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.initialized || Platform.OS === "web") return null;

    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      logger.error("StoreKit: Failed to get customer info", error);
      return null;
    }
  }

  async hasActiveSubscription(): Promise<{
    isActive: boolean;
    tier: "standard" | null;
  }> {
    if (!this.initialized || Platform.OS === "web") {
      return { isActive: false, tier: null };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();

      if (customerInfo.entitlements.active[ENTITLEMENTS.STANDARD]) {
        return { isActive: true, tier: "standard" };
      }

      return { isActive: false, tier: null };
    } catch (error) {
      logger.error("StoreKit: Failed to check subscription", error);
      return { isActive: false, tier: null };
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === "web") {
      return { success: false, error: "StoreKit not available" };
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      try {
        await this.syncPurchaseWithServer(customerInfo);
      } catch (syncError) {
        logger.error("StoreKit: Server sync failed after purchase (non-blocking)", syncError);
      }

      return { success: true, customerInfo };
    } catch (error: unknown) {
      const purchaseError = error as {
        userCancelled?: boolean;
        message?: string;
      };
      if (purchaseError.userCancelled) {
        return { success: false, error: "User cancelled" };
      }
      logger.error("StoreKit: Purchase failed", error);
      return {
        success: false,
        error: purchaseError.message || "Purchase failed",
      };
    }
  }

  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === "web") {
      return { success: false, error: "StoreKit not available" };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();

      await this.syncPurchaseWithServer(customerInfo);

      return { success: true, customerInfo };
    } catch (error: unknown) {
      const restoreError = error as { message?: string };
      logger.error("StoreKit: Restore failed", error);
      return {
        success: false,
        error: restoreError.message || "Restore failed",
      };
    }
  }

  async presentPaywall(options?: {
    offering?: PurchasesOffering;
  }): Promise<PaywallResult> {
    if (!this.initialized || Platform.OS === "web") {
      logger.log("StoreKit: Paywall not available");
      return "not_presented";
    }

    try {
      const result = await RevenueCatUI.presentPaywall(options);

      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        const customerInfo = await Purchases.getCustomerInfo();
        await this.syncPurchaseWithServer(customerInfo);
      }

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          return "purchased";
        case PAYWALL_RESULT.RESTORED:
          return "restored";
        case PAYWALL_RESULT.CANCELLED:
          return "cancelled";
        case PAYWALL_RESULT.ERROR:
          return "error";
        case PAYWALL_RESULT.NOT_PRESENTED:
        default:
          return "not_presented";
      }
    } catch (error) {
      logger.error("StoreKit: Failed to present paywall", error);
      return "error";
    }
  }

  async presentPaywallIfNeeded(
    requiredEntitlementId?: string,
  ): Promise<PaywallResult> {
    if (!this.initialized || Platform.OS === "web") {
      logger.log("StoreKit: Paywall not available");
      return "not_presented";
    }

    try {
      const entitlementId = requiredEntitlementId || ENTITLEMENTS.STANDARD;
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: entitlementId,
      });

      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        const customerInfo = await Purchases.getCustomerInfo();
        await this.syncPurchaseWithServer(customerInfo);
      }

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          return "purchased";
        case PAYWALL_RESULT.RESTORED:
          return "restored";
        case PAYWALL_RESULT.CANCELLED:
          return "cancelled";
        case PAYWALL_RESULT.ERROR:
          return "error";
        case PAYWALL_RESULT.NOT_PRESENTED:
        default:
          return "not_presented";
      }
    } catch (error) {
      logger.error("StoreKit: Failed to present paywall if needed", error);
      return "error";
    }
  }

  async presentCustomerCenter(): Promise<void> {
    if (!this.initialized || Platform.OS === "web") {
      logger.log("StoreKit: Customer Center not available");
      return;
    }

    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onFeedbackSurveyCompleted: ({ feedbackSurveyOptionId }) => {
            logger.log(
              "StoreKit: Feedback survey completed",
              feedbackSurveyOptionId,
            );
          },
          onShowingManageSubscriptions: () => {
            logger.log("StoreKit: Showing manage subscriptions");
          },
          onRestoreStarted: () => {
            logger.log("StoreKit: Restore started from Customer Center");
          },
          onRestoreCompleted: ({ customerInfo }) => {
            logger.log(
              "StoreKit: Restore completed from Customer Center",
              customerInfo,
            );
          },
          onRestoreFailed: ({ error }) => {
            logger.error(
              "StoreKit: Restore failed from Customer Center",
              error,
            );
          },
          onRefundRequestStarted: ({ productIdentifier }) => {
            logger.log("StoreKit: Refund request started", productIdentifier);
          },
          onRefundRequestCompleted: ({
            productIdentifier,
            refundRequestStatus,
          }) => {
            logger.log(
              "StoreKit: Refund request completed",
              productIdentifier,
              refundRequestStatus,
            );
          },
          onManagementOptionSelected: ({ option, url }) => {
            logger.log("StoreKit: Management option selected", option, url);
          },
        },
      });
    } catch (error) {
      logger.error("StoreKit: Failed to present Customer Center", error);
    }
  }

  shouldUseStoreKit(): boolean {
    return (
      (Platform.OS === "ios" || Platform.OS === "android") && this.initialized
    );
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isPaywallAvailable(): boolean {
    return this.initialized && Platform.OS !== "web";
  }

  isCustomerCenterAvailable(): boolean {
    return this.initialized && Platform.OS !== "web";
  }
}

export const storeKitService = new StoreKitService();
