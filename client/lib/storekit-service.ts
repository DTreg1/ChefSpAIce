import { Platform } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

export const ENTITLEMENTS = {
  BASIC: 'basic',
  PRO: 'pro',
} as const;

export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'com.chefspaice.basic.monthly',
  BASIC_ANNUAL: 'com.chefspaice.basic.annual',
  PRO_MONTHLY: 'com.chefspaice.pro.monthly',
  PRO_ANNUAL: 'com.chefspaice.pro.annual',
} as const;

class StoreKitService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (Platform.OS === 'web') return;

    try {
      if (__DEV__) {
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
  }

  async setUserId(userId: string): Promise<void> {
    if (!this.initialized || Platform.OS === 'web') return;

    try {
      await Purchases.logIn(userId);
      console.log('StoreKit: User ID set', userId);
    } catch (error) {
      console.error('StoreKit: Failed to set user ID', error);
    }
  }

  async logout(): Promise<void> {
    if (!this.initialized || Platform.OS === 'web') return;

    try {
      await Purchases.logOut();
      console.log('StoreKit: User logged out');
    } catch (error) {
      console.error('StoreKit: Failed to logout', error);
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    if (!this.initialized || Platform.OS === 'web') return null;

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('StoreKit: Failed to get offerings', error);
      return null;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.initialized || Platform.OS === 'web') return null;

    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('StoreKit: Failed to get customer info', error);
      return null;
    }
  }

  async hasActiveSubscription(): Promise<{ isActive: boolean; tier: 'basic' | 'pro' | null }> {
    if (!this.initialized || Platform.OS === 'web') {
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

  async purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === 'web') {
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
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (!this.initialized || Platform.OS === 'web') {
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

  shouldUseStoreKit(): boolean {
    return (Platform.OS === 'ios' || Platform.OS === 'android') && this.initialized;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const storeKitService = new StoreKitService();
