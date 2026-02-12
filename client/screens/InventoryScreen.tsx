import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { InventorySkeleton } from "@/components/inventory/InventorySkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useDeviceType } from "@/hooks/useDeviceType";
import { Spacing, AppColors } from "@/constants/theme";
import {
  storage,
  FoodItem,
  generateId,
  ConsumedLogEntry,
  WasteLogEntry,
  DEFAULT_STORAGE_LOCATIONS,
  hasSeenSwipeHint,
  markSwipeHintSeen,
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
import { TrialExpiringModal } from "@/components/TrialExpiringModal";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
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
  const { isTablet } = useDeviceType();
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
  const [inventoryStatusLabel, setInventoryStatusLabel] = useState("");
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([
    { key: "all", label: "All", icon: "grid" },
    ...DEFAULT_STORAGE_LOCATIONS.map((loc) => ({ key: loc.key, label: loc.label, icon: loc.icon })),
  ]);

  const { isActive: hasActiveSubscription, isTrialing: serverTrialing, trialDaysRemaining: serverDaysRemaining } = useSubscription();

  const showTrialing = serverTrialing;
  const effectiveDaysRemaining = serverTrialing && serverDaysRemaining !== null ? serverDaysRemaining : 0;

  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [expiringModalDismissed, setExpiringModalDismissed] = useState(false);

  useEffect(() => {
    const checkMilestone = async () => {
      if (!showTrialing || hasActiveSubscription) return;

      if (effectiveDaysRemaining === 1 && !expiringModalDismissed) {
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


  const loadItems = useCallback(async (isInitialLoad = false) => {
    try {
      const [inventoryItems, deletedItems] = await Promise.all([
        storage.getInventory(),
        storage.getDeletedInventory(),
      ]);
      setItems(inventoryItems);
      setRecentlyDeletedCount(deletedItems.length);
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

  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [recentlyDeletedCount, setRecentlyDeletedCount] = useState(0);

  useEffect(() => {
    hasSeenSwipeHint().then((seen) => {
      if (!seen) {
        setShowSwipeHint(true);
        markSwipeHintSeen();
      }
    });
  }, []);

  useEffect(() => {
    if (loading) {
      setInventoryStatusLabel("Loading inventory");
    } else {
      setInventoryStatusLabel(`${items.length} item${items.length !== 1 ? "s" : ""} in inventory`);
    }
  }, [loading, items.length]);

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
    const showNutrition = items.length > 0 && nutritionTotals.itemsWithNutrition > 0;

    return (
      <>
        {showNutrition && (
          <InventoryNutritionSummary nutritionTotals={nutritionTotals} />
        )}
        {recentlyDeletedCount > 0 && (
          <Pressable
            onPress={() => {
              navigation.getParent()?.dispatch(
                CommonActions.navigate({
                  name: "ProfileTab",
                  params: {
                    screen: "Settings",
                    params: { scrollTo: "recentlyDeleted" },
                  },
                })
              );
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: Spacing.md,
              marginTop: Spacing.sm,
            }}
            testID="button-recently-deleted"
            accessibilityRole="button"
            accessibilityLabel={`${recentlyDeletedCount} recently deleted items. Tap to recover.`}
          >
            <Feather name="trash-2" size={14} color={AppColors.primary} />
            <ThemedText
              type="caption"
              style={{ color: AppColors.primary }}
              testID="text-recently-deleted-count"
            >
              {recentlyDeletedCount} recently deleted {recentlyDeletedCount === 1 ? "item" : "items"} — Tap to recover
            </ThemedText>
          </Pressable>
        )}
      </>
    );
  };

  const renderGroupedSection = ({
    item,
    index,
  }: {
    item: {
      title: string;
      icon: string;
      key: string;
      items: FoodItem[];
      itemCount: number;
    };
    index: number;
  }) => {
    return (
      <View style={{ flex: 1 }}>
        <InventoryGroupSection
          section={item}
          isCollapsed={!!collapsedSections[item.key]}
          onToggle={toggleSection}
          onConsumed={handleMarkAsConsumed}
          onWasted={handleMarkAsWasted}
          onItemPress={handleItemPress}
          theme={theme}
          showSwipeHintOnFirst={showSwipeHint && index === 0}
        />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View accessibilityLiveRegion="polite" accessibilityLabel="Loading inventory">
          <InventorySkeleton />
        </View>
      );
    }

    return (
      <View accessibilityLiveRegion="polite" accessibilityLabel="Inventory loaded, no items found">
        <EmptyState
          icon="package"
          title="Your pantry is empty"
          description="Add your first item to start tracking!"
          actionLabel="Add Item"
          onAction={() => navigation.navigate("AddItem" as any)}
        />
      </View>
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
        headerRight={
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
            <SyncStatusIndicator />
          </View>
        }
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

      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={inventoryStatusLabel}
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
      />
      <FlatList
        key={isTablet ? "tablet" : "phone"}
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
        numColumns={isTablet ? 2 : 1}
        {...(isTablet && { columnWrapperStyle: { gap: Spacing.md } })}
        keyExtractor={(item) => item.key}
        renderItem={renderGroupedSection}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderEmptyState}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
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
