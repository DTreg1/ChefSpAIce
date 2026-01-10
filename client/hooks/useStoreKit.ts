import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import type { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { storeKitService, ENTITLEMENTS } from '@/lib/storekit-service';

interface UseStoreKitReturn {
  isLoading: boolean;
  isAvailable: boolean;
  offerings: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  isSubscribed: boolean;
  currentTier: 'basic' | 'pro' | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

export function useStoreKit(): UseStoreKitReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const isAvailable = Platform.OS !== 'web' && storeKitService.isInitialized();

  const isSubscribed = customerInfo?.entitlements?.active
    ? Object.keys(customerInfo.entitlements.active).length > 0
    : false;

  const currentTier: 'basic' | 'pro' | null = customerInfo?.entitlements?.active
    ? customerInfo.entitlements.active[ENTITLEMENTS.PRO]
      ? 'pro'
      : customerInfo.entitlements.active[ENTITLEMENTS.BASIC]
        ? 'basic'
        : null
    : null;

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [fetchedOfferings, fetchedCustomerInfo] = await Promise.all([
          storeKitService.getOfferings(),
          storeKitService.getCustomerInfo(),
        ]);
        setOfferings(fetchedOfferings);
        setCustomerInfo(fetchedCustomerInfo);
      } catch (error) {
        console.error('useStoreKit: Failed to load data', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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
  };
}
