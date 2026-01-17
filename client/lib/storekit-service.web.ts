export interface PurchasesOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: PurchasesPackage[];
}

export interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
    price: number;
  };
}

export interface CustomerInfo {
  entitlements: {
    active: Record<string, {
      identifier: string;
      productIdentifier: string;
      expirationDate: string | null;
      periodType: string;
    }>;
  };
}

export const ENTITLEMENTS = {
  BASIC: 'basic',
  PRO: 'pro',
} as const;

export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'com.chefspaice.basic.monthly',
  BASIC_YEARLY: 'com.chefspaice.basic.annual',
  PRO_MONTHLY: 'com.chefspaice.pro.monthly',
  PRO_YEARLY: 'com.chefspaice.pro.annual',
} as const;

export type PaywallResult = 'purchased' | 'restored' | 'cancelled' | 'error' | 'not_presented';

class StoreKitService {
  setAuthToken(_token: string | null): void {}

  async syncPurchaseWithServer(_customerInfo: CustomerInfo): Promise<boolean> {
    return false;
  }

  async initialize(): Promise<void> {
    console.log('StoreKit: Web platform - using Stripe instead');
  }

  async setUserId(_userId: string): Promise<void> {}

  async logout(): Promise<void> {}

  async getOfferings(): Promise<PurchasesOffering | null> {
    return null;
  }

  async getAllOfferings(): Promise<Record<string, PurchasesOffering> | null> {
    return null;
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    return null;
  }

  async hasActiveSubscription(): Promise<{ isActive: boolean; tier: 'basic' | 'pro' | null }> {
    return { isActive: false, tier: null };
  }

  async purchasePackage(_pkg: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    return { success: false, error: 'StoreKit not available on web' };
  }

  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    return { success: false, error: 'StoreKit not available on web' };
  }

  async presentPaywall(_options?: { offering?: PurchasesOffering }): Promise<PaywallResult> {
    return 'not_presented';
  }

  async presentPaywallIfNeeded(_requiredEntitlementId?: string): Promise<PaywallResult> {
    return 'not_presented';
  }

  async presentCustomerCenter(): Promise<void> {}

  shouldUseStoreKit(): boolean {
    return false;
  }

  isInitialized(): boolean {
    return false;
  }

  isPaywallAvailable(): boolean {
    return false;
  }

  isCustomerCenterAvailable(): boolean {
    return false;
  }
}

export const storeKitService = new StoreKitService();
