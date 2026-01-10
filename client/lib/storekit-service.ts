import { Platform } from 'react-native';

let Purchases: typeof import('react-native-purchases').default | null = null;
let LOG_LEVEL: typeof import('react-native-purchases').LOG_LEVEL | null = null;
let RevenueCatUI: typeof import('react-native-purchases-ui').default | null = null;
let PAYWALL_RESULT: typeof import('react-native-purchases-ui').PAYWALL_RESULT | null = null;

export type { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

if (Platform.OS !== 'web') {
  try {
    const RNPurchases = require('react-native-purchases');
    Purchases = RNPurchases.default;
    LOG_LEVEL = RNPurchases.LOG_LEVEL;
  } catch (e) {
    console.log('StoreKit: react-native-purchases not available (expected in Expo Go)');
  }

  try {
    const RNPurchasesUI = require('react-native-purchases-ui');
    RevenueCatUI = RNPurchasesUI.default;
    PAYWALL_RESULT = RNPurchasesUI.PAYWALL_RESULT;
  } catch (e) {
    console.log('StoreKit: react-native-purchases-ui not available (expected in Expo Go)');
  }
}

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

export const ENTITLEMENTS = {
  BASIC: 'basic',
  PRO: 'pro',
} as const;

export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'com.chefspaice.basic.monthly',
  BASIC_YEARLY: 'com.chefspaice.basic.yearly',
  PRO_MONTHLY: 'com.chefspaice.pro.monthly',
  PRO_YEARLY: 'com.chefspaice.pro.yearly',
  LIFETIME: 'com.chefspaice.lifetime',
} as const;

export type PaywallResult = 'purchased' | 'restored' | 'cancelled' | 'error' | 'not_presented';

class StoreKitService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    if (Platform.OS === 'web') return;
    if (!Purchases) {
      console.log('StoreKit: Native module not available');
      return;
    }

    this.initPromise = (async () => {
      try {
        if (__DEV__ && LOG_LEVEL) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        const apiKey = Platform.select({
          ios: REVENUECAT_IOS_KEY,
          android: REVENUECAT_ANDROID_KEY,
          default: '',
        });

        if (!apiKey) {
          console.warn('StoreKit: No API key configured');
          return;
        }

        await Purchases.configure({ apiKey });
        this.initialized = true;
        console.log('StoreKit: Initialized successfully');
      } catch (error) {
        console.error('StoreKit: Failed to initialize', error);
      }
    })();

    return this.initPromise;
  }

  async setUserId(userId: string): Promise<void> {
    if (Platform.OS === 'web' || !Purchases) return;

    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
    
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.initialized) return;

    try {
      await Purchases.logIn(userId);
      console.log('StoreKit: User ID set', userId);
    } catch (error) {
      console.error('StoreKit: Failed to set user ID', error);
    }
  }

  async logout(): Promise<void> {
    if (!this.initialized || Platform.OS === 'web' || !Purchases) return;

    try {
      await Purchases.logOut();
      console.log('StoreKit: User logged out');
    } catch (error) {
      console.error('StoreKit: Failed to logout', error);
    }
  }

  async getOfferings(): Promise<import('react-native-purchases').PurchasesOffering | null> {
    if (!this.initialized || Platform.OS === 'web' || !Purchases) return null;

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('StoreKit: Failed to get offerings', error);
      return null;
    }
  }

  async getAllOfferings(): Promise<Record<string, import('react-native-purchases').PurchasesOffering> | null> {
    if (!this.initialized || Platform.OS === 'web' || !Purchases) return null;

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.all;
    } catch (error) {
      console.error('StoreKit: Failed to get all offerings', error);
      return null;
    }
  }

  async getCustomerInfo(): Promise<import('react-native-purchases').CustomerInfo | null> {
    if (!this.initialized || Platform.OS === 'web' || !Purchases) return null;

    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('StoreKit: Failed to get customer info', error);
      return null;
    }
  }

  async hasActiveSubscription(): Promise<{ isActive: boolean; tier: 'basic' | 'pro' | null }> {
    if (!this.initialized || Platform.OS === 'web' || !Purchases) {
      return { isActive: false, tier: null };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      if (customerInfo.entitlements.active[ENTITLEMENTS.PRO]) {
        return { isActive: true, tier: 'pro' };
      }
      
      if (customerInfo.entitlements.active[ENTITLEMENTS.BASIC]) {
        return { isActive: true, tier: 'basic' };
      }

      return { isActive: false, tier: null };
    } catch (error) {
      console.error('StoreKit: Failed to check subscription', error);
      return { isActive: false, tier: null };
    }
  }

  async purchasePackage(pkg: import('react-native-purchases').PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: import('react-native-purchases').CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === 'web' || !Purchases) {
      return { success: false, error: 'StoreKit not available' };
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return { success: true, customerInfo };
    } catch (error: unknown) {
      const purchaseError = error as { userCancelled?: boolean; message?: string };
      if (purchaseError.userCancelled) {
        return { success: false, error: 'User cancelled' };
      }
      console.error('StoreKit: Purchase failed', error);
      return { success: false, error: purchaseError.message || 'Purchase failed' };
    }
  }

  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: import('react-native-purchases').CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === 'web' || !Purchases) {
      return { success: false, error: 'StoreKit not available' };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      return { success: true, customerInfo };
    } catch (error: unknown) {
      const restoreError = error as { message?: string };
      console.error('StoreKit: Restore failed', error);
      return { success: false, error: restoreError.message || 'Restore failed' };
    }
  }

  async presentPaywall(options?: {
    offering?: import('react-native-purchases').PurchasesOffering;
  }): Promise<PaywallResult> {
    if (!this.initialized || Platform.OS === 'web' || !RevenueCatUI || !PAYWALL_RESULT) {
      console.log('StoreKit: Paywall not available');
      return 'not_presented';
    }

    try {
      const result = await RevenueCatUI.presentPaywall(options);
      
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          return 'purchased';
        case PAYWALL_RESULT.RESTORED:
          return 'restored';
        case PAYWALL_RESULT.CANCELLED:
          return 'cancelled';
        case PAYWALL_RESULT.ERROR:
          return 'error';
        case PAYWALL_RESULT.NOT_PRESENTED:
        default:
          return 'not_presented';
      }
    } catch (error) {
      console.error('StoreKit: Failed to present paywall', error);
      return 'error';
    }
  }

  async presentPaywallIfNeeded(requiredEntitlementId?: string): Promise<PaywallResult> {
    if (!this.initialized || Platform.OS === 'web' || !RevenueCatUI || !PAYWALL_RESULT) {
      console.log('StoreKit: Paywall not available');
      return 'not_presented';
    }

    try {
      const entitlementId = requiredEntitlementId || ENTITLEMENTS.PRO;
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: entitlementId,
      });
      
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          return 'purchased';
        case PAYWALL_RESULT.RESTORED:
          return 'restored';
        case PAYWALL_RESULT.CANCELLED:
          return 'cancelled';
        case PAYWALL_RESULT.ERROR:
          return 'error';
        case PAYWALL_RESULT.NOT_PRESENTED:
        default:
          return 'not_presented';
      }
    } catch (error) {
      console.error('StoreKit: Failed to present paywall if needed', error);
      return 'error';
    }
  }

  async presentCustomerCenter(): Promise<void> {
    if (!this.initialized || Platform.OS === 'web' || !RevenueCatUI) {
      console.log('StoreKit: Customer Center not available');
      return;
    }

    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onFeedbackSurveyCompleted: ({ feedbackSurveyOptionId }) => {
            console.log('StoreKit: Feedback survey completed', feedbackSurveyOptionId);
          },
          onShowingManageSubscriptions: () => {
            console.log('StoreKit: Showing manage subscriptions');
          },
          onRestoreStarted: () => {
            console.log('StoreKit: Restore started from Customer Center');
          },
          onRestoreCompleted: ({ customerInfo }) => {
            console.log('StoreKit: Restore completed from Customer Center', customerInfo);
          },
          onRestoreFailed: ({ error }) => {
            console.error('StoreKit: Restore failed from Customer Center', error);
          },
          onRefundRequestStarted: ({ productIdentifier }) => {
            console.log('StoreKit: Refund request started', productIdentifier);
          },
          onRefundRequestCompleted: ({ productIdentifier, refundRequestStatus }) => {
            console.log('StoreKit: Refund request completed', productIdentifier, refundRequestStatus);
          },
          onManagementOptionSelected: ({ option, url }) => {
            console.log('StoreKit: Management option selected', option, url);
          },
        },
      });
    } catch (error) {
      console.error('StoreKit: Failed to present Customer Center', error);
    }
  }

  shouldUseStoreKit(): boolean {
    return (Platform.OS === 'ios' || Platform.OS === 'android') && this.initialized;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isPaywallAvailable(): boolean {
    return this.initialized && RevenueCatUI !== null && Platform.OS !== 'web';
  }

  isCustomerCenterAvailable(): boolean {
    return this.initialized && RevenueCatUI !== null && Platform.OS !== 'web';
  }
}

export const storeKitService = new StoreKitService();
