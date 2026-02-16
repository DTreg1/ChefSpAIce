import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { getApiUrl } from "@/lib/query-client";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { GlassHeader } from "@/components/GlassHeader";
import { EmptyState } from "@/components/EmptyState";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { GlassButton } from "@/components/GlassButton";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { getCookwareImage } from "@/assets/cookware";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RootNavigation } from "@/lib/types";
import { useSearch } from "@/contexts/SearchContext";
import { logger } from "@/lib/logger";
import { syncManager } from "@/lib/sync-manager";


interface Appliance {
  id: number;
  name: string;
  category: string;
  description: string;
  icon: string;
  imageUrl?: string;
  isCommon: boolean;
  alternatives: string[];
}

const CATEGORIES = [
  { id: "all", label: "All", icon: "grid" },
  { id: "essential", label: "Essential", icon: "home" },
  { id: "cooking", label: "Cooking", icon: "thermometer" },
  { id: "bakeware", label: "Bakeware", icon: "square" },
  { id: "small appliances", label: "Small Appliances", icon: "zap" },
  { id: "prep tools", label: "Prep Tools", icon: "tool" },
  { id: "specialty", label: "Specialty", icon: "star" },
] as const;

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  thermometer: "thermometer",
  box: "box",
  zap: "zap",
  circle: "circle",
  square: "square",
  droplet: "droplet",
  coffee: "coffee",
  tool: "tool",
  layers: "layers",
  grid: "grid",
  package: "package",
  disc: "disc",
  clipboard: "clipboard",
  target: "target",
  filter: "filter",
  scissors: "scissors",
  edit3: "edit-3",
  sliders: "sliders",
  aperture: "aperture",
  watch: "watch",
  activity: "activity",
  wind: "wind",
  default: "box",
};

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

interface GroupedSectionData {
  key: string;
  title: string;
  icon: string;
  items: Appliance[];
  itemCount: number;
  ownedCount: number;
}

const GroupedSection = React.memo(function GroupedSection({
  section,
  isCollapsed,
  onToggleSection,
  ownedApplianceIds,
  togglingIds,
  onToggleAppliance,
  isAtLimit,
}: {
  section: GroupedSectionData;
  isCollapsed: boolean;
  onToggleSection: (key: string) => void;
  ownedApplianceIds: Set<number>;
  togglingIds: Set<number>;
  onToggleAppliance: (id: number) => void;
  isAtLimit: boolean;
}) {
  const { theme } = useTheme();

  return (
    <GlassCard style={styles.groupCard} contentStyle={styles.groupCardContent}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => onToggleSection(section.key)}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${section.title} section`}
      >
        <View style={styles.sectionHeaderLeft}>
          <Feather
            name={section.icon as keyof typeof Feather.glyphMap}
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
              {section.ownedCount}/{section.itemCount}
            </ThemedText>
          </View>
        </View>
        <Feather
          name={isCollapsed ? "chevron-down" : "chevron-up"}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      <View style={[styles.groupItems, isCollapsed && styles.collapsedItems]}>
        {section.items.map((appliance) => (
          <CookwareItem
            key={appliance.id}
            appliance={appliance}
            isOwned={ownedApplianceIds.has(appliance.id)}
            onToggle={onToggleAppliance}
            isToggling={togglingIds.has(appliance.id)}
            isAtLimit={isAtLimit}
          />
        ))}
      </View>
    </GlassCard>
  );
});

const CookwareItem = React.memo(function CookwareItem({
  appliance,
  isOwned,
  onToggle,
  isToggling,
  isAtLimit,
}: {
  appliance: Appliance;
  isOwned: boolean;
  onToggle: (id: number) => void;
  isToggling: boolean;
  isAtLimit: boolean;
}) {
  const { theme, style: themeStyle } = useTheme();
  const scale = useSharedValue(1);

  const isDisabled = isAtLimit && !isOwned;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    if (isToggling || isDisabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(appliance.id);
  };

  const iconName = ICON_MAP[appliance.icon] || ICON_MAP.default;
  const localImage = getCookwareImage(appliance.name);
  const imageSource =
    localImage ||
    (appliance.imageUrl
      ? { uri: new URL(appliance.imageUrl, getApiUrl()).href }
      : null);

  return (
    <Animated.View style={[styles.itemWrapper, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isToggling || isDisabled}
        style={[
          styles.cookwareItem,
          {
            backgroundColor: isOwned
              ? `${AppColors.primary}15`
              : themeStyle.glass.background,
            borderColor: isOwned ? AppColors.primary : themeStyle.glass.border,
            opacity: isToggling || isDisabled ? 0.4 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${appliance.name}`}
        accessibilityState={{ disabled: isToggling || isDisabled }}
      >
        {isOwned ? (
          <View style={styles.checkIndicator}>
            <Feather name="check" size={12} color="#FFFFFF" />
          </View>
        ) : null}
        <View
          style={[
            styles.imageContainer,
            {
              backgroundColor: isOwned
                ? `${AppColors.primary}10`
                : themeStyle.glass.backgroundSubtle,
              borderColor: isOwned ? `${AppColors.primary}30` : "transparent",
            },
          ]}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.applianceImage}
              contentFit="cover"
              transition={200}
              accessibilityLabel={`Image of ${appliance.name}`}
            />
          ) : (
            <Feather
              name={iconName}
              size={28}
              color={isOwned ? AppColors.primary : theme.textSecondary}
            />
          )}
          {isToggling ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          ) : null}
        </View>
        <View style={styles.itemNameContainer}>
          <ThemedText type="small" style={styles.itemName} numberOfLines={2}>
            {appliance.name}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function CookwareScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, style: themeStyle } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { entitlements } = useSubscription();
  const { getSearchQuery, clearSearch } = useSearch();
  const searchQuery = getSearchQuery("cookware");

  const menuItems: MenuItemConfig[] = [];

  const [showOwnedOnly, _setShowOwnedOnly] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState<boolean | null>(
    null,
  );
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [ownedCookwareIds, setOwnedCookwareIds] = useState<number[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [savingCommon, setSavingCommon] = useState(false);
  const [filterHeaderHeight, setFilterHeaderHeight] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isPro = entitlements.maxCookware === "unlimited";
  const cookwareLimit = typeof entitlements.maxCookware === "number" ? entitlements.maxCookware : Infinity;
  const isAtLimit = !isPro && ownedCookwareIds.length >= cookwareLimit;

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  }, []);

  const { data: allAppliances = [], isLoading: loadingAppliances } = useQuery<
    Appliance[]
  >({
    queryKey: ["/api/appliances"],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: commonAppliances = [] } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances/common"],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const loadCookware = useCallback(async () => {
    try {
      const ids = await storage.getCookware();
      setOwnedCookwareIds(ids);
      // Always update first-time setup status based on current cookware
      setShowFirstTimeSetup(ids.length === 0);
    } catch (error) {
      logger.error("Error loading cookware:", error);
    } finally {
      setLoadingLocal(false);
    }
  }, []);

  useEffect(() => {
    loadCookware();
  }, [loadCookware]);

  useFocusEffect(
    useCallback(() => {
      // Reload cookware every time screen comes into focus
      loadCookware();
    }, [loadCookware]),
  );

  const ownedApplianceIds = useMemo(
    () => new Set(ownedCookwareIds),
    [ownedCookwareIds],
  );

  const loading = loadingAppliances || loadingLocal;
  const isFirstTimeUser = showFirstTimeSetup === true;

  const toggleAppliance = useCallback(
    async (applianceId: number) => {
      if (togglingIds.has(applianceId)) return;

      const isCurrentlyOwned = ownedApplianceIds.has(applianceId);

      setTogglingIds((prev) => new Set(prev).add(applianceId));

      try {
        if (isCurrentlyOwned) {
          await storage.removeCookware(applianceId);
          setOwnedCookwareIds((prev) =>
            prev.filter((id) => id !== applianceId),
          );
        } else {
          await storage.addCookware(applianceId);
          setOwnedCookwareIds((prev) => [...prev, applianceId]);
        }
        if (Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
      } catch (error) {
        logger.error("Error toggling appliance:", error);
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(applianceId);
          return next;
        });
      }
    },
    [togglingIds, ownedApplianceIds],
  );

  const handleAddAllCommon = useCallback(async () => {
    if (savingCommon) return;

    const commonIds = commonAppliances.map((a) => a.id);
    const newIds = commonIds.filter((id) => !ownedApplianceIds.has(id));

    if (newIds.length === 0) {
      setShowFirstTimeSetup(false);
      return;
    }

    setSavingCommon(true);
    try {
      const updatedIds = [...ownedCookwareIds, ...newIds];
      await storage.setCookware(updatedIds);
      setOwnedCookwareIds(updatedIds);
      setShowFirstTimeSetup(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      logger.error("Error adding common appliances:", error);
    } finally {
      setSavingCommon(false);
    }
  }, [commonAppliances, ownedApplianceIds, ownedCookwareIds, savingCommon]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await syncManager.fullSync(); } catch { Alert.alert("Sync failed", "We'll try again shortly"); }
    try {
      const ids = await storage.getCookware();
      setOwnedCookwareIds(ids);
      await queryClient.invalidateQueries({ queryKey: ["/api/appliances"] });
      await queryClient.invalidateQueries({
        queryKey: ["/api/appliances/common"],
      });
    } catch (error) {
      logger.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const filteredAppliances = useMemo(() => {
    let result = allAppliances;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query),
      );
    }

    if (showOwnedOnly) {
      result = result.filter((a) => ownedApplianceIds.has(a.id));
    }

    return result;
  }, [allAppliances, searchQuery, showOwnedOnly, ownedApplianceIds]);

  const groupedAppliances = useMemo(() => {
    const categoryOrder = CATEGORIES.filter((c) => c.id !== "all").map(
      (c) => c.id,
    );
    const groups: {
      key: string;
      title: string;
      icon: string;
      items: Appliance[];
      itemCount: number;
      ownedCount: number;
    }[] = [];

    categoryOrder.forEach((categoryId) => {
      const category = CATEGORIES.find((c) => c.id === categoryId);
      if (!category) return;

      const items = filteredAppliances.filter(
        (a) => a.category.toLowerCase() === categoryId.toLowerCase(),
      );

      if (items.length > 0) {
        const ownedCount = items.filter((a) =>
          ownedApplianceIds.has(a.id),
        ).length;
        groups.push({
          key: categoryId,
          title: category.label,
          icon: category.icon,
          items,
          itemCount: items.length,
          ownedCount,
        });
      }
    });

    return groups;
  }, [filteredAppliances, ownedApplianceIds]);

  const renderGroupedSection = useCallback(
    ({ item }: { item: GroupedSectionData }) => {
      return (
        <GroupedSection
          section={item}
          isCollapsed={collapsedSections[item.key] ?? false}
          onToggleSection={toggleSection}
          ownedApplianceIds={ownedApplianceIds}
          togglingIds={togglingIds}
          onToggleAppliance={toggleAppliance}
          isAtLimit={isAtLimit}
        />
      );
    },
    [
      collapsedSections,
      toggleSection,
      ownedApplianceIds,
      togglingIds,
      toggleAppliance,
      isAtLimit,
    ],
  );

  const renderFirstTimeSetup = () => (
    <GlassCard style={styles.setupCard}>
      <View style={styles.setupIconContainer}>
        <Feather name="tool" size={48} color={AppColors.primary} />
      </View>
      <ThemedText type="h3" style={styles.setupTitle}>
        Let's set up your kitchen
      </ThemedText>
      <ThemedText type="body" style={styles.setupDescription}>
        We've pre-selected common kitchen cookware. Add them all with one tap,
        then customize to match your kitchen.
      </ThemedText>
      <View style={styles.commonItemsPreview}>
        {commonAppliances.slice(0, 6).map((appliance) => (
          <View
            key={appliance.id}
            style={[
              styles.previewItem,
              { backgroundColor: themeStyle.glass.backgroundSubtle },
            ]}
          >
            <Feather
              name={ICON_MAP[appliance.icon] || ICON_MAP.default}
              size={16}
              color={AppColors.primary}
            />
            <ThemedText type="caption" numberOfLines={1}>
              {appliance.name}
            </ThemedText>
          </View>
        ))}
      </View>
      <GlassButton
        onPress={handleAddAllCommon}
        disabled={savingCommon}
        loading={savingCommon}
        style={styles.addAllButton}
      >
        {savingCommon
          ? "Adding..."
          : `Add ${commonAppliances.length} Common Items`}
      </GlassButton>
      <Pressable
        style={styles.skipButton}
        onPress={() => setShowFirstTimeSetup(false)}
        accessibilityRole="button"
        accessibilityLabel="Skip and customize manually"
      >
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Skip and customize manually
        </ThemedText>
      </Pressable>
    </GlassCard>
  );

  const renderHeader = () => {
    if (!isAtLimit) return null;

    return (
      <BlurView
        intensity={15}
        tint={themeStyle.blur.tintDefault}
        style={[styles.headerSection, styles.fixedHeader]}
        onLayout={(e) => setFilterHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Pressable
          style={[
            styles.limitWarning,
            { backgroundColor: `${AppColors.warning}15` },
          ]}
          onPress={() => setShowUpgradePrompt(true)}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to add more cookware"
        >
          <Feather name="alert-circle" size={16} color={AppColors.warning} />
          <ThemedText
            type="small"
            style={{ color: AppColors.warning, flex: 1 }}
          >
            Limit reached ({ownedCookwareIds.length}/{cookwareLimit}).
            Remove an item to select a different one.
          </ThemedText>
          <View style={styles.upgradeChip}>
            <ThemedText type="small" style={styles.upgradeChipText}>
              Upgrade
            </ThemedText>
          </View>
        </Pressable>
      </BlurView>
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon="tool"
      title="No matching cookware"
      description="No cookware matches your current search. Clear the search to see all available items."
      actionLabel="Clear Search"
      onAction={() => clearSearch("cookware")}
    />
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>Loading cookware...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <GlassHeader
        title="Cookware"
        materialIcon="silverware-fork-knife"
        screenKey="cookware"
        searchPlaceholder="Search cookware..."
        showBackButton={true}
        menuItems={menuItems}
      />
      {isFirstTimeUser ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.setupContent,
            {
              paddingTop: 56 + insets.top + Spacing.xs,
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
        >
          {renderFirstTimeSetup()}
        </ScrollView>
      ) : (
        <>
          {renderHeader()}
          <FlashList
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingTop: 56 + insets.top + filterHeaderHeight + Spacing.md,
                paddingBottom: tabBarHeight + Spacing.xl,
              },
            ]}
            scrollIndicatorInsets={{ bottom: insets.bottom }}
            data={groupedAppliances}
            keyExtractor={(item) => item.key}
            renderItem={renderGroupedSection}
            ListEmptyComponent={renderEmptyState}

            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={AppColors.primary}
              />
            }
          />
        </>
      )}

      {showUpgradePrompt && (
        <UpgradePrompt
          type="limit"
          limitName="Cookware"
          remaining={0}
          max={cookwareLimit}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            // Use getParent 3x to reach root: Stack -> Tab -> Drawer -> Root
            const rootNav = navigation.getParent()?.getParent()?.getParent() as RootNavigation | undefined;
            if (rootNav) {
              rootNav.navigate("Main", {
                screen: "Tabs",
                params: {
                  screen: "ProfileTab",
                  params: { screen: "Subscription" },
                },
              });
            }
          }}
          onDismiss={() => setShowUpgradePrompt(false)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  setupContent: {
    paddingHorizontal: Spacing.lg,
  },
  setupCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  setupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  setupTitle: {
    textAlign: "center",
  },
  setupDescription: {
    textAlign: "center",
    opacity: 0.7,
    paddingHorizontal: Spacing.lg,
  },
  commonItemsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  addAllButton: {
    marginTop: Spacing.sm,
  },
  skipButton: {
    paddingVertical: Spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  groupCard: {
    overflow: "hidden",
  },
  groupCardContent: {
    padding: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  groupItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  collapsedItems: {
    height: 0,
    overflow: "hidden",
    paddingBottom: 0,
  },
  headerSection: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  fixedHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    flexShrink: 1,
    minWidth: 0,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.primary,
    flexShrink: 0,
  },
  ownedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  limitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  limitWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  upgradeChip: {
    backgroundColor: AppColors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  upgradeChipText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  itemWrapper: {
    width: "33.33%",
    padding: Spacing.xs,
  },
  cookwareItem: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    height: 140,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  applianceImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  itemNameContainer: {
    height: 34,
    justifyContent: "center",
  },
  itemName: {
    textAlign: "center",
  },
  checkIndicator: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.md,
  },
});
