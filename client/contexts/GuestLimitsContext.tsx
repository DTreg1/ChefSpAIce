import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Alert, Platform } from "react-native";
import { useAuth } from "./AuthContext";
import { storage } from "@/lib/storage";

export const GUEST_LIMITS = {
  MAX_INVENTORY_ITEMS: 3,
  MAX_EQUIPMENT_ITEMS: 3,
} as const;

interface GuestLimitsState {
  inventoryCount: number;
  equipmentCount: number;
}

interface GuestLimitsContextType {
  isGuest: boolean;
  limits: typeof GUEST_LIMITS;
  currentCounts: GuestLimitsState;
  canAddInventoryItem: boolean;
  canAddEquipmentItem: boolean;
  isInstacartEnabled: boolean;
  inventoryRemaining: number;
  equipmentRemaining: number;
  refreshCounts: () => Promise<void>;
  showUpgradePrompt: (feature: "inventory" | "equipment" | "instacart") => void;
  checkInventoryLimit: () => boolean;
  checkEquipmentLimit: () => boolean;
}

const GuestLimitsContext = createContext<GuestLimitsContextType>({
  isGuest: false,
  limits: GUEST_LIMITS,
  currentCounts: { inventoryCount: 0, equipmentCount: 0 },
  canAddInventoryItem: true,
  canAddEquipmentItem: true,
  isInstacartEnabled: true,
  inventoryRemaining: GUEST_LIMITS.MAX_INVENTORY_ITEMS,
  equipmentRemaining: GUEST_LIMITS.MAX_EQUIPMENT_ITEMS,
  refreshCounts: async () => {},
  showUpgradePrompt: () => {},
  checkInventoryLimit: () => true,
  checkEquipmentLimit: () => true,
});

export const useGuestLimits = () => useContext(GuestLimitsContext);

interface GuestLimitsProviderProps {
  children: ReactNode;
  onNavigateToSignUp?: () => void;
}

export function GuestLimitsProvider({ children, onNavigateToSignUp }: GuestLimitsProviderProps) {
  const { isGuest } = useAuth();
  const [currentCounts, setCurrentCounts] = useState<GuestLimitsState>({
    inventoryCount: 0,
    equipmentCount: 0,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const [inventory, cookware] = await Promise.all([
        storage.getInventory(),
        storage.getCookware(),
      ]);
      setCurrentCounts({
        inventoryCount: inventory.length,
        equipmentCount: cookware.length,
      });
    } catch (error) {
      console.error("Error refreshing guest limit counts:", error);
    }
  }, []);

  useEffect(() => {
    if (isGuest) {
      refreshCounts();
    } else {
      setCurrentCounts({ inventoryCount: 0, equipmentCount: 0 });
    }
  }, [isGuest, refreshCounts]);

  const canAddInventoryItem = !isGuest || currentCounts.inventoryCount < GUEST_LIMITS.MAX_INVENTORY_ITEMS;
  const canAddEquipmentItem = !isGuest || currentCounts.equipmentCount < GUEST_LIMITS.MAX_EQUIPMENT_ITEMS;
  const isInstacartEnabled = !isGuest;
  
  const inventoryRemaining = isGuest 
    ? Math.max(0, GUEST_LIMITS.MAX_INVENTORY_ITEMS - currentCounts.inventoryCount)
    : Infinity;
  const equipmentRemaining = isGuest
    ? Math.max(0, GUEST_LIMITS.MAX_EQUIPMENT_ITEMS - currentCounts.equipmentCount)
    : Infinity;

  const showUpgradePrompt = useCallback((feature: "inventory" | "equipment" | "instacart") => {
    const messages = {
      inventory: {
        title: "Inventory Limit Reached",
        message: `Guest accounts can only track ${GUEST_LIMITS.MAX_INVENTORY_ITEMS} items. Create a free account to unlock unlimited inventory tracking, cloud sync, and access from any device.`,
      },
      equipment: {
        title: "Equipment Limit Reached", 
        message: `Guest accounts can only save ${GUEST_LIMITS.MAX_EQUIPMENT_ITEMS} pieces of equipment. Create a free account to save all your kitchen equipment and get better recipe recommendations.`,
      },
      instacart: {
        title: "Feature Locked",
        message: "Instacart integration is only available for registered accounts. Create a free account to send your shopping list directly to Instacart.",
      },
    };

    const { title, message } = messages[feature];

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}\n\nWould you like to create an account?`)) {
        onNavigateToSignUp?.();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Not Now", style: "cancel" },
        { 
          text: "Create Account", 
          onPress: onNavigateToSignUp,
        },
      ]);
    }
  }, [onNavigateToSignUp]);

  const checkInventoryLimit = useCallback(() => {
    if (!isGuest) return true;
    if (currentCounts.inventoryCount >= GUEST_LIMITS.MAX_INVENTORY_ITEMS) {
      showUpgradePrompt("inventory");
      return false;
    }
    return true;
  }, [isGuest, currentCounts.inventoryCount, showUpgradePrompt]);

  const checkEquipmentLimit = useCallback(() => {
    if (!isGuest) return true;
    if (currentCounts.equipmentCount >= GUEST_LIMITS.MAX_EQUIPMENT_ITEMS) {
      showUpgradePrompt("equipment");
      return false;
    }
    return true;
  }, [isGuest, currentCounts.equipmentCount, showUpgradePrompt]);

  const value: GuestLimitsContextType = {
    isGuest,
    limits: GUEST_LIMITS,
    currentCounts,
    canAddInventoryItem,
    canAddEquipmentItem,
    isInstacartEnabled,
    inventoryRemaining,
    equipmentRemaining,
    refreshCounts,
    showUpgradePrompt,
    checkInventoryLimit,
    checkEquipmentLimit,
  };

  return (
    <GuestLimitsContext.Provider value={value}>
      {children}
    </GuestLimitsContext.Provider>
  );
}
