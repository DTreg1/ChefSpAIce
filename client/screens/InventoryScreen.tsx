import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";
import {
  storage,
  FoodItem,
  generateId,
  ConsumedLogEntry,
  WasteLogEntry,
  DEFAULT_STORAGE_LOCATIONS,
} from "@/lib/storage";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";
import { useSearch } from "@/contexts/SearchContext";
import { useInventoryExport } from "@/hooks/useInventoryExport";
import { logger } from "@/lib/logger";

import { FoodGroup, getItemFoodGroup, calculateNutritionTotals } from "@/components/inventory/inventory-utils";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { InventoryFunFact } from "@/components/inventory/InventoryFunFact";
import { InventoryNutritionSummary } from "@/components/inventory/InventoryNutritionSummary";
import { InventoryGroupSection } from "@/components/inventory/InventoryGroupSection";
import { useFunFact } from "@/components/inventory/useFunFact";
import { TrialStatusBadge } from "@/components/TrialStatusBadge";
import { TrialMilestoneBanner } from "@/components/TrialMilestoneBanner";
import { TrialExpiringModal } from "@/components/TrialExpiringModal";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useSubscription } from "@/hooks/useSubscription";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type { FoodGroup };

interface StorageLocationOption {
  key: string;
  label: string;
  icon: string;
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<InventoryStackParamList>>();
  const queryClient = useQueryClient();
  const { handleExport, exporting } = useInventoryExport();

  const { getSearchQuery, collapseSearch } = useSearch();

  const menuItems: MenuItemConfig[] = [
    {
      label: exporting ? "Exporting..." : "Export to CSV",
      icon: "download",
      onPress: handleExport,
      disabled: exporting,
    },
  ];
  const searchQuery = getSearchQuery("inventory");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [selectedFoodGroups, setSelectedFoodGroups] = useState<FoodGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = React.useRef(false);
  const [filterHeaderHeight, setFilterHeaderHeight] = useState(80);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([
    { key: "all", label: "All", icon: "grid" },
    ...DEFAULT_STORAGE_LOCATIONS.map((loc) => ({ key: loc.key, label: loc.label, icon: loc.icon })),
  ]);

  const { isTrialing, daysRemaining } = useTrialStatus();
  const { isActive: hasActiveSubscription, isTrialing: serverTrialing } = useSubscription();

  const showTrialing = isTrialing || serverTrialing;
  const effectiveDaysRemaining = daysRemaining;

  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [expiringModalDismissed, setExpiringModalDismissed] = useState(false);

  useEffect(() => {
    const checkMilestone = async () => {
      if (!showTrialing || hasActiveSubscription) return;

      if (effectiveDaysRemaining <= 1 && effectiveDaysRemaining > 0 && !expiringModalDismissed) {
        const dismissed = await AsyncStorage.getItem("@trial_expiring_modal_dismissed");
        if (!dismissed) {
          setShowExpiringModal(true);
        } else {
          setExpiringModalDismissed(true);
        }
      }
    };
    checkMilestone();
  }, [showTrialing, effectiveDaysRemaining, hasActiveSubscription, expiringModalDismissed]);

  const handleDismissExpiringModal = async () => {
    setShowExpiringModal(false);
    setExpiringModalDismissed(true);
    await AsyncStorage.setItem("@trial_expiring_modal_dismissed", "true");
  };

  const showMilestoneBanner = showTrialing && !hasActiveSubscription && effectiveDaysRemaining <= 3 && effectiveDaysRemaining > 0;

  const loadItems = useCallback(async (isInitialLoad = false) => {
    try {
      const inventoryItems = await storage.getInventory();
      setItems(inventoryItems);
      hasLoadedRef.current = true;
    } catch (error) {
      logger.error("Error loading inventory:", error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  const loadStorageLocations = useCallback(async () => {
    try {
      const allLocations = await storage.getAllStorageLocations();
      setStorageLocations([
        { key: "all", label: "All", icon: "grid" },
        ...allLocations,
      ]);
    } catch (error) {
      logger.error("Error loading storage locations:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      if (hasLoadedRef.current) {
        loadItems(false);
        loadStorageLocations();
      }
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      collapseSearch("inventory");
    });
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, loadItems, loadStorageLocations, collapseSearch]);

  useEffect(() => {
    loadItems(true);
    loadStorageLocations();
  }, []);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        return item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.storageLocation || "").toLowerCase().includes(query);
      });
    }
    if (selectedFoodGroups.length > 0) {
      filtered = filtered.filter((item) => {
        const itemFoodGroup = getItemFoodGroup(item);
        return itemFoodGroup !== null && selectedFoodGroups.includes(itemFoodGroup);
      });
    }
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchQuery, selectedFoodGroups]);

  const nutritionTotals = useMemo(() => calculateNutritionTotals(filteredItems), [filteredItems]);
  const { funFact, funFactLoading, funFactTimeRemaining, showFunFact, handleRefreshFunFact } = useFunFact(items, nutritionTotals);

  const groupedSections = useMemo(() => {
    const locationOrder = storageLocations.filter((loc) => loc.key !== "all").map((loc) => loc.key);
    const grouped: Record<string, FoodItem[]> = {};
    locationOrder.forEach((loc) => { grouped[loc] = []; });
    filteredItems.forEach((item) => {
      const loc = item.storageLocation || "pantry";
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(item);
    });
    return locationOrder.map((loc) => {
      const locationInfo = storageLocations.find((l) => l.key === loc);
      return {
        title: locationInfo?.label || loc.charAt(0).toUpperCase() + loc.slice(1),
        icon: locationInfo?.icon || "box",
        key: loc,
        items: grouped[loc],
        itemCount: grouped[loc].length,
      };
    });
  }, [filteredItems, storageLocations]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadItems(),
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions/waste-reduction"] }),
    ]);
    setRefreshing(false);
  };

  const handleMarkAsConsumed = (item: FoodItem) => {
    Alert.alert(
      "Mark as Consumed",
      `Mark "${item.name}" as consumed? This will remove it from your inventory.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Consumed",
          onPress: async () => {
            const entry: ConsumedLogEntry = {
              id: generateId(),
              itemName: item.name,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category,
              nutrition: item.nutrition,
              date: new Date().toISOString(),
            };
            await storage.addConsumedEntry(entry);
            await storage.deleteInventoryItem(item.id);
            loadItems();
          },
        },
      ],
    );
  };

  const handleMarkAsWasted = (item: FoodItem) => {
    Alert.alert("Mark as Wasted", "What happened to this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Expired",
        onPress: () => logWaste(item, "expired"),
      },
      {
        text: "Spoiled",
        onPress: () => logWaste(item, "spoiled"),
      },
      {
        text: "Not Wanted",
        onPress: () => logWaste(item, "not_wanted"),
      },
    ]);
  };

  const logWaste = async (item: FoodItem, reason: string) => {
    const entry: WasteLogEntry = {
      id: generateId(),
      itemName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      reason: reason as "expired" | "spoiled" | "not_wanted" | "other",
      date: new Date().toISOString(),
    };
    await storage.addWasteEntry(entry);
    await storage.deleteInventoryItem(item.id);
    loadItems();
  };

  const handleToggleFoodGroup = (groupKey: FoodGroup) => {
    setSelectedFoodGroups((prev) => {
      const isSelected = prev.includes(groupKey);
      const newSelection = isSelected
        ? prev.filter((g) => g !== groupKey)
        : [...prev, groupKey];
      logger.log("[Filter] Selected food groups:", newSelection);
      return newSelection;
    });
  };

  const handleItemPress = (itemId: string) => {
    navigation.navigate("ItemDetail", { itemId });
  };

  const renderListHeader = () => (
    <>
      {showMilestoneBanner && (
        <TrialMilestoneBanner daysRemaining={effectiveDaysRemaining} />
      )}
      <InventoryFunFact
        funFact={funFact}
        funFactLoading={funFactLoading}
        funFactTimeRemaining={funFactTimeRemaining}
        onRefresh={handleRefreshFunFact}
        theme={theme}
        showFunFact={showFunFact}
      />
    </>
  );

  const renderListFooter = () => {
    if (items.length === 0) return null;
    if (nutritionTotals.itemsWithNutrition === 0) return null;

    return <InventoryNutritionSummary nutritionTotals={nutritionTotals} />;
  };

  const renderGroupedSection = ({
    item,
  }: {
    item: {
      title: string;
      icon: string;
      key: string;
      items: FoodItem[];
      itemCount: number;
    };
  }) => {
    return (
      <InventoryGroupSection
        section={item}
        isCollapsed={!!collapsedSections[item.key]}
        onToggle={toggleSection}
        onConsumed={handleMarkAsConsumed}
        onWasted={handleMarkAsWasted}
        onItemPress={handleItemPress}
        theme={theme}
      />
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return <LoadingState variant="list" count={6} />;
    }

    return (
      <EmptyState
        icon="package"
        title="Your pantry is empty"
        description="Add your first item to start tracking!"
        actionLabel="Add Item"
        onAction={() => navigation.navigate("AddItem" as any)}
      />
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      testID="screen-inventory"
      accessibilityRole="none"
    >
      <ExpoGlassHeader
        title="Kitchen"
        materialIcon="stove"
        screenKey="inventory"
        searchPlaceholder="Search items..."
        menuItems={menuItems}
        headerRight={<TrialStatusBadge compact />}
      />
      <View
        style={[styles.searchContainer, { top: 56 + insets.top }]}
        onLayout={(e) => setFilterHeaderHeight(e.nativeEvent.layout.height)}
      >
        <InventoryFilters
          selectedFoodGroups={selectedFoodGroups}
          onToggleFoodGroup={handleToggleFoodGroup}
          theme={theme}
        />
      </View>

      <FlatList
        style={styles.list}
        accessibilityRole="list"
        accessibilityLabel="Inventory items"
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: 56 + insets.top + filterHeaderHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={groupedSections}
        keyExtractor={(item) => item.key}
        renderItem={renderGroupedSection}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
      />
      <TrialExpiringModal
        visible={showExpiringModal}
        onDismiss={handleDismissExpiringModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  list: {
    flex: 1,
    ...Platform.select({
      web: {
        scrollbarWidth: "none",
      } as any,
    }),
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
});
