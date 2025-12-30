import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { NutritionBadge } from "@/components/NutritionBadge";
import { NutritionScoreBadge } from "@/components/NutritionScoreBadge";
import { InventoryListSkeleton } from "@/components/Skeleton";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  AppColors,
  GlassEffect,
} from "@/constants/theme";
import {
  storage,
  FoodItem,
  getExpirationStatus,
  getDaysUntilExpiration,
  formatDate,
  generateId,
  ConsumedLogEntry,
  WasteLogEntry,
  DEFAULT_STORAGE_LOCATIONS,
} from "@/lib/storage";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";

type FoodGroup =
  | "all"
  | "grains"
  | "vegetables"
  | "fruits"
  | "protein"
  | "dairy";
type SortOption = "name" | "quantity";

interface StorageLocationOption {
  key: string;
  label: string;
  icon: string;
}

const FOOD_GROUPS: { key: FoodGroup; label: string }[] = [
  { key: "all", label: "All" },
  { key: "grains", label: "Grains" },
  { key: "vegetables", label: "Vegetables" },
  { key: "fruits", label: "Fruits" },
  { key: "protein", label: "Protein" },
  { key: "dairy", label: "Dairy" },
];

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: "name", label: "Name A-Z", icon: "type" },
  { key: "quantity", label: "Quantity", icon: "hash" },
];

const CATEGORY_TO_FOOD_GROUP: Record<string, FoodGroup> = {
  dairy: "dairy",
  meat: "protein",
  seafood: "protein",
  bread: "grains",
  grains: "grains",
  bakery: "grains",
};

const FRUIT_NAMES = [
  "apple",
  "banana",
  "orange",
  "grape",
  "berry",
  "strawberry",
  "blueberry",
  "raspberry",
  "mango",
  "pineapple",
  "watermelon",
  "melon",
  "peach",
  "pear",
  "cherry",
  "lemon",
  "lime",
  "kiwi",
  "avocado",
  "plum",
  "grapefruit",
];

const getItemFoodGroup = (item: FoodItem): FoodGroup | null => {
  const categoryLower = item.category.toLowerCase().trim();
  const nameLower = item.name.toLowerCase().trim();

  if (CATEGORY_TO_FOOD_GROUP[categoryLower]) {
    return CATEGORY_TO_FOOD_GROUP[categoryLower];
  }

  if (categoryLower === "produce") {
    const isFruit = FRUIT_NAMES.some((fruit) => nameLower.includes(fruit));
    return isFruit ? "fruits" : "vegetables";
  }

  if (
    nameLower.includes("milk") ||
    nameLower.includes("cheese") ||
    nameLower.includes("yogurt")
  ) {
    return "dairy";
  }

  if (
    nameLower.includes("chicken") ||
    nameLower.includes("beef") ||
    nameLower.includes("pork") ||
    nameLower.includes("turkey") ||
    nameLower.includes("salmon") ||
    nameLower.includes("tuna") ||
    nameLower.includes("shrimp") ||
    nameLower.includes("fish") ||
    nameLower === "eggs"
  ) {
    return "protein";
  }

  if (
    nameLower.includes("bread") ||
    nameLower.includes("pasta") ||
    nameLower.includes("rice") ||
    nameLower.includes("cereal") ||
    nameLower.includes("oat")
  ) {
    return "grains";
  }

  const isFruit = FRUIT_NAMES.some((fruit) => nameLower.includes(fruit));
  if (isFruit) return "fruits";

  return null;
};

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<InventoryStackParamList>>();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<FoodItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [foodGroupFilter, setFoodGroupFilter] = useState<FoodGroup>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterHeaderHeight, setFilterHeaderHeight] = useState(120);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([
    { key: "all", label: "All", icon: "grid" },
    ...DEFAULT_STORAGE_LOCATIONS.map(loc => ({ key: loc.key, label: loc.label, icon: loc.icon })),
  ]);

  const calculateNutritionTotals = useCallback((itemList: FoodItem[]) => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let itemsWithNutrition = 0;

    itemList.forEach((item) => {
      if (item.nutrition) {
        totalCalories += item.nutrition.calories * item.quantity;
        totalProtein += item.nutrition.protein * item.quantity;
        totalCarbs += item.nutrition.carbs * item.quantity;
        totalFat += item.nutrition.fat * item.quantity;
        itemsWithNutrition++;
      }
    });

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
      itemsWithNutrition,
    };
  }, []);

  const nutritionTotals = calculateNutritionTotals(filteredItems);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (foodGroupFilter !== "all") count++;
    return count;
  }, [searchQuery, foodGroupFilter]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setFoodGroupFilter("all");
    setSortOption("name");
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const inventoryItems = await storage.getInventory();
      setItems(inventoryItems);
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
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
      console.error("Error loading storage locations:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
      loadStorageLocations();
    }, [loadItems, loadStorageLocations]),
  );

  useEffect(() => {
    let filtered = items;

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesLocation = (item.storageLocation || "").toLowerCase().includes(query);
        return matchesName || matchesCategory || matchesLocation;
      });
    }

    // Food group filter
    if (foodGroupFilter !== "all") {
      filtered = filtered.filter((item) => {
        const itemFoodGroup = getItemFoodGroup(item);
        return itemFoodGroup === foodGroupFilter;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "name":
          return a.name.localeCompare(b.name);
        case "quantity":
          return b.quantity - a.quantity;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredItems(filtered);
  }, [items, searchQuery, foodGroupFilter, sortOption]);

  const groupedSections = useMemo(() => {
    const locationOrder = storageLocations
      .filter((loc) => loc.key !== "all")
      .map((loc) => loc.key);
    const grouped: Record<string, FoodItem[]> = {};

    locationOrder.forEach((loc) => {
      grouped[loc] = [];
    });

    filteredItems.forEach((item) => {
      const loc = item.storageLocation || "pantry";
      if (!grouped[loc]) {
        grouped[loc] = [];
      }
      grouped[loc].push(item);
    });

    return locationOrder.map((loc) => {
      const locationInfo = storageLocations.find((l) => l.key === loc);
      return {
        title:
          locationInfo?.label || loc.charAt(0).toUpperCase() + loc.slice(1),
        icon: locationInfo?.icon || "box",
        key: loc,
        items: grouped[loc],
        itemCount: grouped[loc].length,
      };
    });
  }, [filteredItems, storageLocations]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadItems(),
      queryClient.invalidateQueries({
        queryKey: ["/api/suggestions/waste-reduction"],
      }),
    ]);
    setRefreshing(false);
  };

  const renderListHeader = () => {
    if (items.length === 0) return null;
    return (
      <View style={styles.listHeader}>
        {nutritionTotals.itemsWithNutrition > 0 ? (
          <GlassCard style={styles.nutritionSummary}>
            <View style={styles.nutritionSummaryContent}>
              <Feather name="zap" size={16} color={AppColors.primary} />
              <ThemedText type="small" style={styles.nutritionSummaryText}>
                {nutritionTotals.calories.toLocaleString()} cal | {nutritionTotals.protein}g protein | {nutritionTotals.carbs}g carbs | {nutritionTotals.fat}g fat
              </ThemedText>
            </View>
            <ThemedText type="caption" style={styles.nutritionSummaryMeta}>
              Based on {nutritionTotals.itemsWithNutrition} items with nutrition
              data
            </ThemedText>
          </GlassCard>
        ) : null}
      </View>
    );
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

  const SWIPE_THRESHOLD = 20;
  const ACTION_WIDTH = 80;

  const SwipeableItemCard = ({ item }: { item: FoodItem }) => {
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const status = getExpirationStatus(item.expirationDate);
    const daysLeft = getDaysUntilExpiration(item.expirationDate);

    const getBadgeColor = () => {
      switch (status) {
        case "expired":
          return AppColors.error;
        case "expiring":
          return AppColors.warning;
        default:
          return AppColors.success;
      }
    };

    const getBadgeText = () => {
      if (status === "expired") return "Expired";
      if (daysLeft === 0) return "Today";
      if (daysLeft === 1) return "Tomorrow";
      return `${daysLeft} days`;
    };

    const handleConsumed = () => {
      translateX.value = withSpring(0);
      handleMarkAsConsumed(item);
    };

    const handleWasted = () => {
      translateX.value = withSpring(0);
      handleMarkAsWasted(item);
    };

    const panGesture = Gesture.Pan()
      .activeOffsetX([-20, 20])
      .failOffsetY([-15, 15])
      .onStart(() => {
        startX.value = translateX.value;
      })
      .onUpdate((event) => {
        const newValue = startX.value + event.translationX;
        translateX.value = Math.max(
          -ACTION_WIDTH,
          Math.min(ACTION_WIDTH, newValue),
        );
      })
      .onEnd((event) => {
        if (event.translationX > SWIPE_THRESHOLD) {
          translateX.value = withSpring(ACTION_WIDTH);
        } else if (event.translationX < -SWIPE_THRESHOLD) {
          translateX.value = withSpring(-ACTION_WIDTH);
        } else {
          translateX.value = withSpring(0);
        }
      });

    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const consumedActionStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, ACTION_WIDTH],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            translateX.value,
            [0, ACTION_WIDTH / 2, ACTION_WIDTH],
            [0.5, 0.8, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }));

    const wastedActionStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-ACTION_WIDTH, 0],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            translateX.value,
            [-ACTION_WIDTH, -ACTION_WIDTH / 2, 0],
            [1, 0.8, 0.5],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }));

    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.swipeContainer}
      >
        <Pressable style={styles.consumedAction} onPress={handleConsumed}>
          <LinearGradient
            colors={["rgba(46, 204, 113, 0.25)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.actionGradient}
          >
            <Animated.View
              style={[styles.actionButtonInner, consumedActionStyle]}
            >
              <Feather name="check-circle" size={22} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.actionText}>
                Consumed
              </ThemedText>
            </Animated.View>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.wastedAction} onPress={handleWasted}>
          <LinearGradient
            colors={["transparent", "rgba(231, 76, 60, 0.25)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.actionGradient}
          >
            <Animated.View style={[styles.actionButtonInner, wastedActionStyle]}>
              <Feather name="trash-2" size={22} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.actionText}>
                Wasted
              </ThemedText>
            </Animated.View>
          </LinearGradient>
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[cardStyle, styles.cardWrapper]}>
            <Pressable
              onPress={() =>
                navigation.navigate("ItemDetail", { itemId: item.id })
              }
            >
              <GlassView
                style={[
                  styles.itemCard,
                  {
                    borderColor: theme.glass.border,
                  },
                ]}
              >
                <View style={styles.itemCardContent}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <ThemedText type="h4" numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText type="small" style={styles.itemCategory}>
                        {item.category} · {item.quantity} {item.unit}
                      </ThemedText>
                    </View>
                    <View style={styles.headerRight}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: getBadgeColor() + "E6" },
                        ]}
                      >
                        <ThemedText type="caption" style={styles.badgeText}>
                          {getBadgeText()}
                        </ThemedText>
                      </View>
                      <View style={styles.headerNutrition}>
                        {item.nutrition ? (
                          <NutritionBadge
                            nutrition={item.nutrition}
                            quantity={item.quantity}
                            showCalories={true}
                            showMacros={false}
                          />
                        ) : null}
                        {item.nutrition ? (
                          <NutritionScoreBadge
                            nutrition={item.nutrition}
                            size="small"
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.itemFooter}>
                    <ThemedText type="caption" style={styles.expirationText}>
                      Expires {formatDate(item.expirationDate)}
                    </ThemedText>
                    {item.nutrition ? (
                      <NutritionBadge
                        nutrition={item.nutrition}
                        quantity={item.quantity}
                        showCalories={false}
                        showMacros={true}
                      />
                    ) : null}
                  </View>
                </View>
              </GlassView>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    );
  };

  const GroupedSection = ({
    section,
  }: {
    section: {
      title: string;
      icon: string;
      key: string;
      items: FoodItem[];
      itemCount: number;
    };
  }) => {
    const isCollapsed = collapsedSections[section.key];
    return (
      <GlassCard
        style={styles.groupCard}
        contentStyle={styles.groupCardContent}
      >
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.key)}
        >
          <View style={styles.sectionHeaderLeft}>
            <Feather
              name={section.icon as any}
              size={18}
              color={AppColors.primary}
            />
            <ThemedText type="h4" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <View
              style={[
                styles.sectionCount,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {section.itemCount}
              </ThemedText>
            </View>
          </View>
          <Feather
            name={isCollapsed ? "chevron-down" : "chevron-up"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
        {!isCollapsed && section.items.length > 0 ? (
          <View style={styles.groupItems}>
            {section.items.map((item) => (
              <SwipeableItemCard key={item.id} item={item} />
            ))}
          </View>
        ) : null}
      </GlassCard>
    );
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
    return <GroupedSection section={item} />;
  };

  const renderEmptyState = () => {
    if (loading) {
      return <InventoryListSkeleton sectionCount={3} />;
    }
    
    return (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIconContainer,
            {
              backgroundColor: theme.glass.background,
              borderColor: theme.glass.border,
            },
          ]}
        >
          <Feather name="inbox" size={48} color={theme.textSecondary} />
        </View>
        <ThemedText type="h3" style={styles.emptyTitle}>
          Your pantry is empty
        </ThemedText>
        <ThemedText type="body" style={styles.emptySubtitle}>
          Tap the + button to add your first item
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <BlurView
        intensity={15}
        tint={isDark ? "dark" : "light"}
        style={[styles.searchContainer, styles.searchBlur]}
        onLayout={(e) => setFilterHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.glass.backgroundSubtle,
              borderColor: theme.glass.border,
            },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search items..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Summary Row */}
        {(activeFilterCount > 0 || filteredItems.length !== items.length) && (
          <View style={styles.filterSummaryRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {filteredItems.length} of {items.length} items
              {activeFilterCount > 0 ? ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)` : ''}
            </ThemedText>
            {activeFilterCount > 0 && (
              <Pressable
                testID="button-clear-filters"
                style={[
                  styles.clearFiltersButton,
                  { borderColor: theme.glass.border },
                ]}
                onPress={clearAllFilters}
              >
                <Feather name="x" size={12} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                  Clear
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {/* Food Group + Sort Row */}
        <View style={styles.filterRow}>
          {FOOD_GROUPS.map((group) => (
            <Pressable
              key={group.key}
              testID={`filter-foodgroup-${group.key}`}
              style={[
                styles.foodGroupChip,
                {
                  backgroundColor:
                    foodGroupFilter === group.key
                      ? AppColors.primary + "30"
                      : "transparent",
                  borderColor:
                    foodGroupFilter === group.key
                      ? AppColors.primary
                      : theme.glass.border,
                },
              ]}
              onPress={() => setFoodGroupFilter(group.key)}
            >
              <ThemedText
                type="caption"
                style={{
                  color:
                    foodGroupFilter === group.key
                      ? AppColors.primary
                      : theme.textSecondary,
                }}
              >
                {group.label}
              </ThemedText>
            </Pressable>
          ))}
          
          {/* Sort Button */}
          <Pressable
            testID="button-sort-inventory"
            style={[
              styles.foodGroupChip,
              {
                backgroundColor: theme.glass.background,
                borderColor: theme.glass.border,
              },
            ]}
            onPress={() => {
              const currentIndex = SORT_OPTIONS.findIndex(s => s.key === sortOption);
              const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
              setSortOption(SORT_OPTIONS[nextIndex].key);
            }}
          >
            <Feather
              name={SORT_OPTIONS.find(s => s.key === sortOption)?.icon as any || "bar-chart-2"}
              size={14}
              color={theme.textSecondary}
              style={{ marginRight: Spacing.xs }}
            />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {SORT_OPTIONS.find(s => s.key === sortOption)?.label || "Sort"}
            </ThemedText>
          </Pressable>
        </View>
      </BlurView>

      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: filterHeaderHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={groupedSections}
        keyExtractor={(item) => item.key}
        renderItem={renderGroupedSection}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
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
  searchBlur: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  searchContent: {},
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: GlassEffect.borderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: BorderRadius.md,
  },
  consumedAction: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 125,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    overflow: "hidden",
  },
  wastedAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 125,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderTopRightRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    overflow: "hidden",
  },
  actionGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    zIndex: 2,
  },
  actionButtonInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  itemCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  itemCardContent: {
    padding: Spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  headerNutrition: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  itemRightColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  itemCategory: {
    marginTop: Spacing.xs,
    opacity: 0.8,
    letterSpacing: 0.3,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  expirationText: {
    opacity: 0.8,
    letterSpacing: 0.3,
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  listHeader: {
    gap: Spacing.md,
  },
  nutritionSummary: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  nutritionSummaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nutritionSummaryText: {
    flex: 1,
  },
  nutritionSummaryMeta: {
    marginTop: Spacing.xs,
    marginLeft: 24,
  },
  foodGroupFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  filterSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  foodGroupChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
  },
  nutritionFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  nutritionFilterChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
  },
  groupCard: {
    marginBottom: Spacing.md,
  },
  groupCardContent: {
    padding: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  groupItems: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
});
