import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import type { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { storeKitService, ENTITLEMENTS, PaywallResult } from '@/lib/storekit-service';

interface UseStoreKitReturn {
  isLoading: boolean;
  isAvailable: boolean;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  isSubscribed: boolean;
  currentTier: 'pro' | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
  presentPaywall: (options?: { offering?: PurchasesOffering }) => Promise<PaywallResult>;
  presentPaywallIfNeeded: (requiredEntitlementId?: string) => Promise<PaywallResult>;
  presentCustomerCenter: () => Promise<void>;
  isPaywallAvailable: boolean;
  isCustomerCenterAvailable: boolean;
}

export function useStoreKit(): UseStoreKitReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPaywallAvailable, setIsPaywallAvailable] = useState(false);
  const [isCustomerCenterAvailable, setIsCustomerCenterAvailable] = useState(false);

  const isSubscribed = customerInfo?.entitlements?.active
    ? Object.keys(customerInfo.entitlements.active).length > 0
    : false;

  const currentTier: 'pro' | null = customerInfo?.entitlements?.active
    ? (customerInfo.entitlements.active[ENTITLEMENTS.PRO] || 
       customerInfo.entitlements.active[ENTITLEMENTS.CHEFSPAICE_PRO])
      ? 'pro'
      : null
    : null;

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      setIsAvailable(false);
      setIsPaywallAvailable(false);
      setIsCustomerCenterAvailable(false);
      return;
    }

    const initAndLoad = async () => {
      setIsLoading(true);
      try {
        await storeKitService.initialize();
        
        const initialized = storeKitService.isInitialized();
        setIsAvailable(initialized);
        
        setIsPaywallAvailable(storeKitService.isPaywallAvailable());
        setIsCustomerCenterAvailable(storeKitService.isCustomerCenterAvailable());
        
        if (initialized) {
          const [fetchedOfferings, fetchedCustomerInfo] = await Promise.all([
            storeKitService.getOfferings(),
            storeKitService.getCustomerInfo(),
          ]);
          setOfferings(fetchedOfferings);
          setCustomerInfo(fetchedCustomerInfo);
        }
      } catch (error) {
        console.error('useStoreKit: Failed to load data', error);
        setIsAvailable(false);
        setIsPaywallAvailable(false);
        setIsCustomerCenterAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAndLoad();
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await storeKitService.purchasePackage(pkg);
      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
      }
      return result.success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await storeKitService.restorePurchases();
      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
      }
      return result.success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    const info = await storeKitService.getCustomerInfo();
    if (info) {
      setCustomerInfo(info);
    }
  }, []);

  const presentPaywall = useCallback(async (options?: { offering?: PurchasesOffering }): Promise<PaywallResult> => {
    setIsLoading(true);
    try {
      const result = await storeKitService.presentPaywall(options);
      if (result === 'purchased' || result === 'restored') {
        await refreshCustomerInfo();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshCustomerInfo]);

  const presentPaywallIfNeeded = useCallback(async (requiredEntitlementId?: string): Promise<PaywallResult> => {
    setIsLoading(true);
    try {
      const result = await storeKitService.presentPaywallIfNeeded(requiredEntitlementId);
      if (result === 'purchased' || result === 'restored') {
        await refreshCustomerInfo();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshCustomerInfo]);

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    await storeKitService.presentCustomerCenter();
    await refreshCustomerInfo();
  }, [refreshCustomerInfo]);

  return {
    isLoading,
    isAvailable,
    offerings,
    customerInfo,
    isSubscribed,
    currentTier,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    presentPaywall,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    isPaywallAvailable,
    isCustomerCenterAvailable,
  };
}
