import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  Pressable,
  ViewStyle,
  ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";

import * as Haptics from "expo-haptics";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { InventorySkeleton } from "@/components/inventory/InventorySkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { GlassCard } from "@/components/GlassCard";
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
import type { InventoryNavigation } from "@/lib/types";
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
  const { isTablet, isLandscape } = useDeviceType();
  const navigation =
    useNavigation<InventoryNavigation>();
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([
    { key: "all", label: "All", icon: "grid" },
    ...DEFAULT_STORAGE_LOCATIONS.map((loc) => ({ key: loc.key, label: loc.label, icon: loc.icon })),
  ]);

  const { isActive: hasActiveSubscription } = useSubscription();

  const [showExpiringModal, setShowExpiringModal] = useState(false);

  useEffect(() => {
    // No trial milestone checks needed
  }, [hasActiveSubscription]);

  const handleDismissExpiringModal = async () => {
    setShowExpiringModal(false);
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

  const handleMarkAsConsumed = async (item: FoodItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadItems();
          },
        },
      ],
    );
  };

  const handleMarkAsWasted = async (item: FoodItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    if (isTablet) {
      setSelectedItemId(itemId);
    } else {
      navigation.navigate("ItemDetail", { itemId });
    }
  };

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((item) => item.id === selectedItemId) || null;
  }, [selectedItemId, items]);

  const sidePanelWidth = isTablet && isLandscape ? 380 : 320;

  const renderListHeader = () => (
    <>
      
      <View
        accessibilityLabel={funFact ? `Fun fact: ${funFact}` : "Loading fun fact"}
        accessibilityRole="text"
      >
        <InventoryFunFact
          funFact={funFact}
          funFactLoading={funFactLoading}
          funFactTimeRemaining={funFactTimeRemaining}
          onRefresh={handleRefreshFunFact}
          theme={theme}
          showFunFact={showFunFact}
        />
      </View>
    </>
  );

  const renderListFooter = () => {
    const showNutrition = items.length > 0 && nutritionTotals.itemsWithNutrition > 0;

    return (
      <>
        {showNutrition && (
          <View
            accessibilityLabel={`Nutrition summary: ${nutritionTotals.calories.toLocaleString()} calories, ${nutritionTotals.protein}g protein, ${nutritionTotals.carbs}g carbs, ${nutritionTotals.fat}g fat`}
            accessibilityRole="summary"
          >
            <InventoryNutritionSummary nutritionTotals={nutritionTotals} />
          </View>
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
              accessibilityRole="text"
              accessibilityLabel={`${recentlyDeletedCount} recently deleted ${recentlyDeletedCount === 1 ? "item" : "items"}, tap to recover`}
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
      <View
        style={{ flex: 1 }}
        accessibilityLabel={`${item.title} section, ${item.itemCount} ${item.itemCount === 1 ? "item" : "items"}`}
        accessibilityRole="header"
      >
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
          onAction={() => navigation.navigate("AddItem")}
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
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}
            accessibilityLabel="Sync status"
            accessibilityRole="text"
          >
            <SyncStatusIndicator />
          </View>
        }
      />
      <View
        style={[styles.searchContainer, { top: 56 + insets.top }]}
        onLayout={(e) => setFilterHeaderHeight(e.nativeEvent.layout.height)}
        accessibilityLabel="Food group filters"
        accessibilityRole="toolbar"
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
      <View style={isTablet ? styles.masterDetailRow : styles.masterDetailColumn}>
        <View style={{ flex: 1 }}>
          <FlashList
            key={isTablet ? "tablet-3col" : "phone"}
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
            numColumns={isTablet ? 3 : 1}
            keyExtractor={(item) => item.key}
            renderItem={renderGroupedSection}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderListFooter}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={AppColors.primary}
                accessibilityLabel={refreshing ? "Refreshing inventory" : "Pull to refresh inventory"}
                accessibilityRole="button"
              />
            }
          />
        </View>
        {isTablet && (
          <View
            style={[
              styles.sidePanel,
              {
                width: sidePanelWidth,
                backgroundColor: theme.backgroundSecondary || theme.backgroundDefault,
                borderLeftColor: theme.border,
                paddingTop: 56 + insets.top + Spacing.md,
                paddingBottom: tabBarHeight + Spacing.md,
              },
            ]}
            testID="panel-item-detail"
          >
            {selectedItem ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: Spacing.lg }}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sidePanelHeader}>
                  <ThemedText type="h3" style={{ flex: 1 }}>
                    {selectedItem.name}
                  </ThemedText>
                  <Pressable
                    onPress={() => setSelectedItemId(null)}
                    style={[styles.closeButton, { backgroundColor: theme.backgroundRoot }]}
                    testID="button-close-side-panel"
                    accessibilityRole="button"
                    accessibilityLabel="Close detail panel"
                  >
                    <Feather name="x" size={18} color={theme.text} />
                  </Pressable>
                </View>

                <GlassCard style={{ marginTop: Spacing.md }}>
                  <View style={styles.detailRow}>
                    <Feather name="tag" size={16} color={AppColors.primary} />
                    <View style={{ marginLeft: Spacing.sm }}>
                      <ThemedText type="caption">Category</ThemedText>
                      <ThemedText type="body">{selectedItem.category}</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.detailRow, { marginTop: Spacing.md }]}>
                    <Feather name="hash" size={16} color={AppColors.primary} />
                    <View style={{ marginLeft: Spacing.sm }}>
                      <ThemedText type="caption">Quantity</ThemedText>
                      <ThemedText type="body">
                        {selectedItem.quantity} {selectedItem.unit}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.detailRow, { marginTop: Spacing.md }]}>
                    <Feather name="map-pin" size={16} color={AppColors.primary} />
                    <View style={{ marginLeft: Spacing.sm }}>
                      <ThemedText type="caption">Storage Location</ThemedText>
                      <ThemedText type="body">
                        {selectedItem.storageLocation
                          ? selectedItem.storageLocation.charAt(0).toUpperCase() + selectedItem.storageLocation.slice(1)
                          : "Not set"}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.detailRow, { marginTop: Spacing.md }]}>
                    <Feather name="calendar" size={16} color={AppColors.primary} />
                    <View style={{ marginLeft: Spacing.sm }}>
                      <ThemedText type="caption">Expiration Date</ThemedText>
                      <ThemedText type="body">
                        {selectedItem.expirationDate
                          ? new Date(selectedItem.expirationDate).toLocaleDateString()
                          : "Not set"}
                      </ThemedText>
                    </View>
                  </View>
                </GlassCard>

                <Pressable
                  onPress={() => navigation.navigate("ItemDetail", { itemId: selectedItem.id })}
                  style={[styles.viewFullDetailsButton, { backgroundColor: AppColors.primary }]}
                  testID="button-view-full-details"
                  accessibilityRole="button"
                  accessibilityLabel="View full details"
                >
                  <Feather name="maximize-2" size={16} color="#FFFFFF" />
                  <ThemedText type="button" style={{ color: "#FFFFFF", marginLeft: Spacing.sm }}>
                    View Full Details
                  </ThemedText>
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.sidePanelPlaceholder}>
                <Feather name="inbox" size={48} color={theme.textSecondary} />
                <ThemedText
                  type="body"
                  style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}
                >
                  Select an item
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ textAlign: "center", marginTop: Spacing.xs }}
                >
                  Tap an item from the list to see its details here
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
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
  masterDetailRow: {
    flex: 1,
    flexDirection: "row",
  },
  masterDetailColumn: {
    flex: 1,
  },
  list: {
    flex: 1,
    ...Platform.select({
      web: {
        scrollbarWidth: "none",
      } as unknown as ViewStyle,
    }),
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  sidePanel: {
    borderLeftWidth: 1,
  },
  sidePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  sidePanelPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  viewFullDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
});
