import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
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
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

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

interface CookwareSelectorProps {
  onComplete: (selectedIds: number[]) => void;
  preselected?: number[];
  mode: "setup" | "edit";
}

const CATEGORIES = [
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

function CookwareItem({
  appliance,
  isSelected,
  onToggle,
}: {
  appliance: Appliance;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  const iconName = ICON_MAP[appliance.icon] || ICON_MAP.default;
  const imageSource = appliance.imageUrl
    ? { uri: new URL(appliance.imageUrl, getApiUrl()).href }
    : null;

  return (
    <Animated.View style={[styles.itemWrapper, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.cookwareItem,
          {
            backgroundColor: isSelected
              ? `${AppColors.primary}15`
              : theme.glass.background,
            borderColor: isSelected ? AppColors.primary : theme.glass.border,
          },
        ]}
      >
        <View
          style={[
            styles.imageContainer,
            {
              backgroundColor: isSelected
                ? `${AppColors.primary}10`
                : theme.glass.backgroundSubtle,
              borderColor: isSelected
                ? `${AppColors.primary}30`
                : "transparent",
            },
          ]}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.applianceImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Feather
              name={iconName}
              size={24}
              color={isSelected ? AppColors.primary : theme.textSecondary}
            />
          )}
        </View>
        <ThemedText type="small" style={styles.itemName} numberOfLines={2}>
          {appliance.name}
        </ThemedText>
        <View
          style={[
            styles.checkIndicator,
            {
              backgroundColor: isSelected ? AppColors.primary : "transparent",
              borderColor: isSelected ? AppColors.primary : theme.glass.border,
            },
          ]}
        >
          {isSelected ? (
            <Feather name="check" size={14} color="#FFFFFF" />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function CategorySection({
  category,
  appliances,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  category: (typeof CATEGORIES)[number];
  appliances: Appliance[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const { theme } = useTheme();
  const selectedInCategory = appliances.filter((a) =>
    selectedIds.has(a.id),
  ).length;
  const allSelected = selectedInCategory === appliances.length;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          <Feather
            name={category.icon as keyof typeof Feather.glyphMap}
            size={18}
            color={AppColors.primary}
          />
          <ThemedText type="h4" style={styles.categoryTitle}>
            {category.label}
          </ThemedText>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <ThemedText type="caption" style={{ color: AppColors.primary }}>
              {selectedInCategory}/{appliances.length}
            </ThemedText>
          </View>
        </View>
        <Pressable
          style={[
            styles.selectAllButton,
            { backgroundColor: theme.glass.backgroundSubtle },
          ]}
          onPress={allSelected ? onDeselectAll : onSelectAll}
        >
          <Feather
            name={allSelected ? "x-square" : "check-square"}
            size={14}
            color={theme.textSecondary}
          />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {allSelected ? "Deselect All" : "Select All"}
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.categoryGrid}>
        {appliances.map((appliance) => (
          <CookwareItem
            key={appliance.id}
            appliance={appliance}
            isSelected={selectedIds.has(appliance.id)}
            onToggle={() => onToggle(appliance.id)}
          />
        ))}
      </View>
    </View>
  );
}

export function CookwareSelector({
  onComplete,
  preselected = [],
  mode,
}: CookwareSelectorProps) {
  const { theme } = useTheme();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(preselected),
  );
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: allAppliances = [], isLoading } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances"],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: commonAppliances = [] } = useQuery<Appliance[]>({
    queryKey: ["/api/appliances/common"],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const hasInitializedCommon = useRef(false);

  useEffect(() => {
    if (
      mode === "setup" &&
      commonAppliances.length > 0 &&
      !hasInitializedCommon.current &&
      preselected.length === 0
    ) {
      hasInitializedCommon.current = true;
      setSelectedIds(new Set(commonAppliances.map((a) => a.id)));
    }
  }, [mode, commonAppliances, preselected.length]);

  const appliancesByCategory = useMemo(() => {
    const grouped: Record<string, Appliance[]> = {};
    CATEGORIES.forEach((cat) => {
      grouped[cat.id] = allAppliances.filter(
        (a) => a.category.toLowerCase() === cat.id.toLowerCase(),
      );
    });
    return grouped;
  }, [allAppliances]);

  const toggleItem = useCallback((id: number) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllInCategory = useCallback(
    (categoryId: string) => {
      const items = appliancesByCategory[categoryId] || [];
      setSelectedIds((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.add(item.id));
        return next;
      });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [appliancesByCategory],
  );

  const deselectAllInCategory = useCallback(
    (categoryId: string) => {
      const items = appliancesByCategory[categoryId] || [];
      setSelectedIds((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.delete(item.id));
        return next;
      });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [appliancesByCategory],
  );

  const selectAllCommon = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      commonAppliances.forEach((item) => next.add(item.id));
      return next;
    });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [commonAppliances]);

  const handleContinue = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onComplete(Array.from(selectedIds));
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        <ThemedText type="body" style={styles.loadingText}>
          Loading cookware...
        </ThemedText>
      </ThemedView>
    );
  }

  if (showConfirmation) {
    const selectedAppliances = allAppliances.filter((a) =>
      selectedIds.has(a.id),
    );
    const byCategory = CATEGORIES.map((cat) => ({
      ...cat,
      items: selectedAppliances.filter(
        (a) => a.category.toLowerCase() === cat.id.toLowerCase(),
      ),
    })).filter((cat) => cat.items.length > 0);

    return (
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.confirmationContent}
        >
          <View style={styles.confirmationHeader}>
            <View
              style={[
                styles.confirmationIcon,
                { backgroundColor: `${AppColors.primary}15` },
              ]}
            >
              <Feather
                name="check-circle"
                size={48}
                color={AppColors.primary}
              />
            </View>
            <ThemedText type="h2" style={styles.confirmationTitle}>
              Ready to Save
            </ThemedText>
            <ThemedText type="body" style={styles.confirmationSubtitle}>
              You have {selectedIds.size} items selected
            </ThemedText>
          </View>

          {byCategory.map((cat) => (
            <GlassCard key={cat.id} style={styles.summaryCategoryCard}>
              <View style={styles.summaryCategoryHeader}>
                <Feather
                  name={cat.icon as keyof typeof Feather.glyphMap}
                  size={16}
                  color={AppColors.primary}
                />
                <ThemedText type="h4" style={styles.summaryCategoryTitle}>
                  {cat.label}
                </ThemedText>
                <View
                  style={[
                    styles.summaryBadge,
                    { backgroundColor: `${AppColors.primary}15` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: AppColors.primary }}
                  >
                    {cat.items.length}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.summaryItems}>
                {cat.items.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.summaryItem,
                      { backgroundColor: theme.glass.backgroundSubtle },
                    ]}
                  >
                    <ThemedText type="caption">{item.name}</ThemedText>
                  </View>
                ))}
              </View>
            </GlassCard>
          ))}
        </ScrollView>

        <View
          style={[styles.footer, { backgroundColor: theme.backgroundDefault }]}
        >
          <GlassButton
            variant="secondary"
            onPress={handleBack}
            style={styles.backButton}
          >
            Back
          </GlassButton>
          <GlassButton onPress={handleConfirm} style={styles.confirmButton}>
            Confirm Selection
          </GlassButton>
        </View>
      </ThemedView>
    );
  }

  if (mode === "setup") {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.setupContent}
        >
          <View style={styles.welcomeHeader}>
            <View
              style={[
                styles.welcomeIcon,
                { backgroundColor: `${AppColors.primary}15` },
              ]}
            >
              <Feather name="tool" size={48} color={AppColors.primary} />
            </View>
            <ThemedText type="h2" style={styles.welcomeTitle}>
              Welcome to Your Kitchen
            </ThemedText>
            <ThemedText type="body" style={styles.welcomeSubtitle}>
              What cookware do you have? Select the items in your kitchen so we
              can suggest recipes you can actually make.
            </ThemedText>
          </View>

          <GlassCard style={styles.quickActionsCard}>
            <View style={styles.quickActionsHeader}>
              <Feather name="zap" size={20} color={AppColors.accent} />
              <ThemedText type="h4">Quick Start</ThemedText>
            </View>
            <ThemedText type="small" style={styles.quickActionsDescription}>
              Start with common kitchen items, then customize to match your
              setup.
            </ThemedText>
            <GlassButton onPress={selectAllCommon} style={styles.selectCommonButton}>
              Select All Common Items ({commonAppliances.length})
            </GlassButton>
          </GlassCard>

          {CATEGORIES.map((category) => {
            const items = appliancesByCategory[category.id] || [];
            if (items.length === 0) return null;
            return (
              <CategorySection
                key={category.id}
                category={category}
                appliances={items}
                selectedIds={selectedIds}
                onToggle={toggleItem}
                onSelectAll={() => selectAllInCategory(category.id)}
                onDeselectAll={() => deselectAllInCategory(category.id)}
              />
            );
          })}
        </ScrollView>

        <View
          style={[styles.footer, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.selectionCount}>
            <Feather name="check-circle" size={20} color={AppColors.primary} />
            <ThemedText type="body" style={{ color: AppColors.primary }}>
              {selectedIds.size} items selected
            </ThemedText>
          </View>
          <GlassButton
            onPress={handleContinue}
            disabled={selectedIds.size === 0}
            style={styles.continueButton}
          >
            Continue
          </GlassButton>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.gridContent}
        data={allAppliances}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        renderItem={({ item }) => (
          <CookwareItem
            appliance={item}
            isSelected={selectedIds.has(item.id)}
            onToggle={() => toggleItem(item.id)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.editHeader}>
            <ThemedText type="h4">Select your cookware</ThemedText>
            <View style={styles.selectionBadge}>
              <ThemedText type="small" style={{ color: AppColors.primary }}>
                {selectedIds.size} selected
              </ThemedText>
            </View>
          </View>
        }
      />

      <View
        style={[styles.footer, { backgroundColor: theme.backgroundDefault }]}
      >
        <GlassButton onPress={handleContinue} style={styles.saveButton}>
          Save Changes
        </GlassButton>
      </View>
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
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  confirmationContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  gridContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  list: {
    flex: 1,
  },
  welcomeHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeTitle: {
    textAlign: "center",
  },
  welcomeSubtitle: {
    textAlign: "center",
    opacity: 0.7,
    paddingHorizontal: Spacing.lg,
  },
  quickActionsCard: {
    gap: Spacing.md,
  },
  quickActionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quickActionsDescription: {
    opacity: 0.7,
  },
  selectCommonButton: {
    marginTop: Spacing.sm,
  },
  categorySection: {
    gap: Spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryTitle: {
    marginLeft: Spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm,
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
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
    minHeight: 120,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  applianceImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
  },
  itemName: {
    textAlign: "center",
    flex: 1,
  },
  checkIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    gap: Spacing.md,
  },
  selectionCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  continueButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  backButton: {
    flex: 0.4,
  },
  confirmButton: {
    flex: 0.6,
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  selectionBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: `${AppColors.primary}15`,
  },
  confirmationHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  confirmationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationTitle: {
    textAlign: "center",
  },
  confirmationSubtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  summaryCard: {
    gap: Spacing.lg,
  },
  summaryCategoryCard: {
    marginBottom: Spacing.md,
  },
  summaryCategory: {
    gap: Spacing.sm,
  },
  summaryCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  summaryCategoryTitle: {
    flex: 1,
  },
  summaryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  summaryItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  summaryItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
});
