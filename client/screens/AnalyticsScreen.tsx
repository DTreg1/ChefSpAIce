import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { subDays, isWithinInterval, parseISO } from "date-fns";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { WasteReductionStats } from "@/components/WasteReductionStats";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  FoodItem,
  WasteLogEntry,
  ConsumedLogEntry,
  getExpirationStatus,
  getDaysUntilExpiration,
} from "@/lib/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2;

type TimeRange = "week" | "month" | "all";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const menuItems: MenuItemConfig[] = [];

  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [wasteLog, setWasteLog] = useState<WasteLogEntry[]>([]);
  const [consumedLog, setConsumedLog] = useState<ConsumedLogEntry[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const loadData = useCallback(async () => {
    const [items, waste, consumed] = await Promise.all([
      storage.getInventory(),
      storage.getWasteLog(),
      storage.getConsumedLog(),
    ]);
    setInventory(items);
    setWasteLog(waste);
    setConsumedLog(consumed);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const getTimeRangeData = useCallback(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subDays(now, 365);
    }

    const filteredWaste = wasteLog.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: startDate, end: now });
    });

    const filteredConsumed = consumedLog.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: startDate, end: now });
    });

    return { filteredWaste, filteredConsumed, startDate };
  }, [timeRange, wasteLog, consumedLog]);

  const { filteredWaste, filteredConsumed } = getTimeRangeData();

  const expiredCount = inventory.filter(
    (i) => getExpirationStatus(i.expirationDate) === "expired",
  ).length;
  const expiringCount = inventory.filter(
    (i) => getExpirationStatus(i.expirationDate) === "expiring",
  ).length;
  const freshCount = inventory.filter(
    (i) => getExpirationStatus(i.expirationDate) === "fresh",
  ).length;

  const categoryBreakdown = inventory.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sortedCategories = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const wasteByReason = filteredWaste.reduce(
    (acc, entry) => {
      const label =
        entry.reason === "expired"
          ? "Expired"
          : entry.reason === "spoiled"
            ? "Spoiled"
            : entry.reason === "not_wanted"
              ? "Not Wanted"
              : "Other";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalNutrition = filteredConsumed.reduce(
    (acc, entry) => {
      if (entry.nutrition) {
        acc.calories += entry.nutrition.calories;
        acc.protein += entry.nutrition.protein;
        acc.carbs += entry.nutrition.carbs;
        acc.fat += entry.nutrition.fat;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const daysInRange =
    timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;
  const avgDailyCalories = Math.round(totalNutrition.calories / daysInRange);

  const expirationTimeline = inventory
    .filter(
      (item) =>
        getDaysUntilExpiration(item.expirationDate) >= 0 &&
        getDaysUntilExpiration(item.expirationDate) <= 14,
    )
    .sort(
      (a, b) =>
        getDaysUntilExpiration(a.expirationDate) -
        getDaysUntilExpiration(b.expirationDate),
    )
    .slice(0, 6);

  const wasteReductionScore = Math.max(
    0,
    100 -
      Math.round(
        (filteredWaste.length /
          Math.max(1, filteredConsumed.length + filteredWaste.length)) *
          100,
      ),
  );

  const renderProgressBar = (value: number, max: number, color: string) => {
    const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${percentage}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderScoreGauge = (score: number) => {
    const getScoreColor = () => {
      if (score >= 80) return AppColors.success;
      if (score >= 60) return AppColors.warning;
      return AppColors.error;
    };

    const getScoreLabel = () => {
      if (score >= 80) return "Excellent";
      if (score >= 60) return "Good";
      if (score >= 40) return "Fair";
      return "Needs Work";
    };

    return (
      <View style={styles.gaugeContainer}>
        <View style={[styles.gaugeOuter, { borderColor: theme.border }]}>
          <View
            style={[styles.gaugeInner, { backgroundColor: getScoreColor() }]}
          >
            <ThemedText type="h1" style={styles.gaugeScore}>
              {score}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="body" style={styles.gaugeLabel}>
          {getScoreLabel()}
        </ThemedText>
        <ThemedText type="caption" style={styles.gaugeSubLabel}>
          Waste Reduction Score
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ExpoGlassHeader
        title="Analytics"
        screenKey="analytics"
        showSearch={false}
        showBackButton={true}
        menuItems={menuItems}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
      <View style={styles.timeRangeSelector}>
        {(["week", "month", "all"] as TimeRange[]).map((range) => (
          <Pressable
            key={range}
            style={[
              styles.timeRangeButton,
              {
                backgroundColor:
                  timeRange === range
                    ? AppColors.primary
                    : theme.backgroundDefault,
              },
            ]}
            onPress={() => setTimeRange(range)}
          >
            <ThemedText
              type="small"
              style={{ color: timeRange === range ? "#FFFFFF" : theme.text }}
            >
              {range === "week"
                ? "7 Days"
                : range === "month"
                  ? "30 Days"
                  : "All Time"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {renderScoreGauge(wasteReductionScore)}

      <WasteReductionStats />

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Inventory Health
        </ThemedText>
        <View style={styles.healthGrid}>
          <View
            style={[
              styles.healthItem,
              { backgroundColor: `${AppColors.success}15` },
            ]}
          >
            <Feather name="check-circle" size={24} color={AppColors.success} />
            <ThemedText type="h2" style={{ color: AppColors.success }}>
              {freshCount}
            </ThemedText>
            <ThemedText type="caption">Fresh</ThemedText>
          </View>
          <View
            style={[
              styles.healthItem,
              { backgroundColor: `${AppColors.warning}15` },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={24}
              color={AppColors.warning}
            />
            <ThemedText type="h2" style={{ color: AppColors.warning }}>
              {expiringCount}
            </ThemedText>
            <ThemedText type="caption">Expiring</ThemedText>
          </View>
          <View
            style={[
              styles.healthItem,
              { backgroundColor: `${AppColors.error}15` },
            ]}
          >
            <Feather name="x-circle" size={24} color={AppColors.error} />
            <ThemedText type="h2" style={{ color: AppColors.error }}>
              {expiredCount}
            </ThemedText>
            <ThemedText type="caption">Expired</ThemedText>
          </View>
        </View>
      </GlassCard>

      {expirationTimeline.length > 0 ? (
        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Expiring Soon
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionSubtitle}>
            Use these items first to reduce waste
          </ThemedText>
          <View style={styles.timelineContainer}>
            {expirationTimeline.map((item, index) => {
              const daysLeft = getDaysUntilExpiration(item.expirationDate);
              const status = getExpirationStatus(item.expirationDate);
              const statusColor =
                status === "expired"
                  ? AppColors.error
                  : status === "expiring"
                    ? AppColors.warning
                    : AppColors.success;

              return (
                <View key={item.id} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: statusColor },
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <ThemedText type="body">{item.name}</ThemedText>
                    <ThemedText type="caption" style={{ color: statusColor }}>
                      {daysLeft === 0
                        ? "Today"
                        : daysLeft === 1
                          ? "Tomorrow"
                          : `${daysLeft} days`}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.timelineChip,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText type="caption">
                      {item.storageLocation}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Top Categories
        </ThemedText>
        {sortedCategories.length > 0 ? (
          <View style={styles.categoryList}>
            {sortedCategories.map(([category, count], index) => (
              <View key={category} style={styles.categoryRow}>
                <View style={styles.categoryLabel}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: getCategoryColor(index) },
                    ]}
                  />
                  <ThemedText type="body">{category}</ThemedText>
                </View>
                {renderProgressBar(
                  count,
                  inventory.length,
                  getCategoryColor(index),
                )}
                <ThemedText type="small" style={styles.categoryCount}>
                  {count}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="pie-chart" size={32} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.emptyText}>
              Add items to see category breakdown
            </ThemedText>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Waste Analysis
        </ThemedText>
        {filteredWaste.length > 0 ? (
          <View style={styles.wasteBreakdown}>
            <View style={styles.wasteSummary}>
              <View style={styles.wasteStatItem}>
                <Feather name="trash-2" size={20} color={AppColors.error} />
                <ThemedText type="h3" style={{ color: AppColors.error }}>
                  {filteredWaste.length}
                </ThemedText>
                <ThemedText type="caption">Items Wasted</ThemedText>
              </View>
              <View style={styles.wasteStatItem}>
                <Feather
                  name="check-square"
                  size={20}
                  color={AppColors.success}
                />
                <ThemedText type="h3" style={{ color: AppColors.success }}>
                  {filteredConsumed.length}
                </ThemedText>
                <ThemedText type="caption">Items Used</ThemedText>
              </View>
            </View>
            <View style={styles.reasonBreakdown}>
              {Object.entries(wasteByReason).map(([reason, count]) => (
                <View key={reason} style={styles.reasonRow}>
                  <ThemedText type="body">{reason}</ThemedText>
                  <View style={styles.reasonBar}>
                    <View
                      style={[
                        styles.reasonFill,
                        {
                          width: `${(count / filteredWaste.length) * 100}%`,
                          backgroundColor: AppColors.error,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small">{count}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="thumbs-up" size={32} color={AppColors.success} />
            <ThemedText
              type="body"
              style={{ fontWeight: "600", marginTop: Spacing.sm }}
            >
              No waste recorded
            </ThemedText>
            <ThemedText type="small" style={styles.emptyText}>
              Great job keeping waste to a minimum!
            </ThemedText>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Nutrition Summary
        </ThemedText>
        <ThemedText type="caption" style={styles.sectionSubtitle}>
          Based on consumed items with nutrition data
        </ThemedText>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Feather name="zap" size={20} color={AppColors.primary} />
            <ThemedText type="h3" style={{ color: AppColors.primary }}>
              {totalNutrition.calories.toLocaleString()}
            </ThemedText>
            <ThemedText type="caption">Total Calories</ThemedText>
          </View>
          <View style={styles.nutritionItem}>
            <ThemedText type="h4" style={{ color: AppColors.secondary }}>
              ~{avgDailyCalories}
            </ThemedText>
            <ThemedText type="caption">Daily Avg</ThemedText>
          </View>
        </View>
        <View style={styles.macroGrid}>
          <View style={styles.macroItem}>
            <View
              style={[
                styles.macroIndicator,
                { backgroundColor: AppColors.secondary },
              ]}
            />
            <View style={styles.macroContent}>
              <ThemedText type="body">{totalNutrition.protein}g</ThemedText>
              <ThemedText type="caption">Protein</ThemedText>
            </View>
          </View>
          <View style={styles.macroItem}>
            <View
              style={[
                styles.macroIndicator,
                { backgroundColor: AppColors.accent },
              ]}
            />
            <View style={styles.macroContent}>
              <ThemedText type="body">{totalNutrition.carbs}g</ThemedText>
              <ThemedText type="caption">Carbs</ThemedText>
            </View>
          </View>
          <View style={styles.macroItem}>
            <View
              style={[
                styles.macroIndicator,
                { backgroundColor: AppColors.warning },
              ]}
            />
            <View style={styles.macroContent}>
              <ThemedText type="body">{totalNutrition.fat}g</ThemedText>
              <ThemedText type="caption">Fat</ThemedText>
            </View>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Feather name="sun" size={20} color={AppColors.secondary} />
          <ThemedText type="h4">Tips to Reduce Waste</ThemedText>
        </View>
        <View style={styles.tipsList}>
          {expiringCount > 0 ? (
            <View style={styles.tipItem}>
              <Feather name="check" size={16} color={AppColors.success} />
              <ThemedText type="small" style={styles.tipText}>
                Use {expiringCount} expiring items in your next meal
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.tipItem}>
            <Feather name="check" size={16} color={AppColors.success} />
            <ThemedText type="small" style={styles.tipText}>
              Store fruits and vegetables separately
            </ThemedText>
          </View>
          <View style={styles.tipItem}>
            <Feather name="check" size={16} color={AppColors.success} />
            <ThemedText type="small" style={styles.tipText}>
              Plan meals before shopping to buy only what you need
            </ThemedText>
          </View>
          <View style={styles.tipItem}>
            <Feather name="check" size={16} color={AppColors.success} />
            <ThemedText type="small" style={styles.tipText}>
              Freeze items before they expire to extend shelf life
            </ThemedText>
          </View>
        </View>
      </GlassCard>
      </ScrollView>
    </View>
  );
}

function getCategoryColor(index: number): string {
  const colors = [
    AppColors.primary,
    AppColors.secondary,
    AppColors.accent,
    AppColors.warning,
    AppColors.success,
  ];
  return colors[index % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  timeRangeSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  timeRangeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  gaugeContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  gaugeOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeScore: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  gaugeLabel: {
    marginTop: Spacing.md,
    fontWeight: "600",
  },
  gaugeSubLabel: {
    marginTop: Spacing.xs,
    opacity: 0.7,
  },
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    opacity: 0.7,
    marginTop: -Spacing.xs,
  },
  healthGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  healthItem: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  timelineContainer: {
    gap: Spacing.md,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelineChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryList: {
    gap: Spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  categoryLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: 100,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryCount: {
    width: 30,
    textAlign: "right",
    fontWeight: "600",
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  wasteBreakdown: {
    gap: Spacing.lg,
  },
  wasteSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  wasteStatItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  reasonBreakdown: {
    gap: Spacing.sm,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  reasonBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 3,
    overflow: "hidden",
  },
  reasonFill: {
    height: "100%",
    borderRadius: 3,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.md,
  },
  nutritionItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  macroIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  macroContent: {
    gap: Spacing.xs,
  },
  tipsCard: {
    backgroundColor: "#FFF8E7",
    gap: Spacing.md,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.sm,
    opacity: 0.7,
    textAlign: "center",
  },
});
