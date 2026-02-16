import React, { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { subDays, isWithinInterval, parseISO } from "date-fns";

import { GlassHeader } from "@/components/GlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { WasteReductionStats } from "@/components/WasteReductionStats";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors, Typography } from "@/constants/theme";
import {
  storage,
  FoodItem,
  WasteLogEntry,
  ConsumedLogEntry,
  getExpirationStatus,
  getDaysUntilExpiration,
} from "@/lib/storage";
import { apiClient } from "@/lib/api-client";

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
  const [wasteSummary, setWasteSummary] = useState<{
    currentPeriod: { wasteCount: number; consumedCount: number; totalItems: number; wasteScore: number; periodLabel: string };
    trends: Array<{ weekStart: string; wasteCount: number; consumedCount: number; wasteScore: number }>;
    streak: { currentStreak: number; longestStreak: number; lastUpdated: string | null };
  } | null>(null);

  const loadData = useCallback(async () => {
    const [items, waste, consumed] = await Promise.all([
      storage.getInventory(),
      storage.getWasteLog(),
      storage.getConsumedLog(),
    ]);
    setInventory(items);
    setWasteLog(waste);
    setConsumedLog(consumed);

    try {
      const period = timeRange === "week" ? "week" : "month";
      const data = await apiClient.get<{
        currentPeriod: { wasteCount: number; consumedCount: number; totalItems: number; wasteScore: number; periodLabel: string };
        trends: Array<{ weekStart: string; wasteCount: number; consumedCount: number; wasteScore: number }>;
        streak: { currentStreak: number; longestStreak: number; lastUpdated: string | null };
      }>(`/api/analytics/waste-summary?period=${period}&weeks=12`);
      setWasteSummary(data);
    } catch (e) {
    }
  }, [timeRange]);

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
      <View
        style={styles.gaugeContainer}
        accessibilityRole="text"
        accessibilityLabel={`Waste reduction score: ${score} out of 100, rated ${getScoreLabel()}`}
      >
        <View style={[styles.gaugeOuter, { borderColor: theme.border }]}>
          <View
            style={[styles.gaugeInner, { backgroundColor: getScoreColor() }]}
          >
            <ThemedText type="h2" style={styles.gaugeScore}>
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
      <GlassHeader
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
              accessibilityRole="button"
              accessibilityLabel={`Select ${range === "week" ? "weekly" : range === "month" ? "monthly" : "all time"} range`}
            >
              <ThemedText
                type="small"
                style={{ color: timeRange === range ? theme.buttonText : theme.text }}
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

        {renderScoreGauge(wasteSummary?.currentPeriod.wasteScore ?? wasteReductionScore)}

        {wasteSummary && wasteSummary.trends.length > 0 ? (
          <GlassCard style={styles.section} testID="section-weekly-trends" accessibilityRole="summary" accessibilityLabel="Weekly waste reduction trends">
            <ThemedText type="h4" style={styles.sectionTitle}>
              Weekly Trends
            </ThemedText>
            <ThemedText type="caption" style={styles.sectionSubtitle}>
              Waste reduction score over time
            </ThemedText>
            <View style={styles.trendChart} testID="chart-waste-trends">
              {wasteSummary.trends.slice(-8).map((t, i) => {
                const barHeight = Math.max(4, (t.wasteScore / 100) * 80);
                const barColor = t.wasteScore >= 80
                  ? AppColors.success
                  : t.wasteScore >= 60
                    ? AppColors.warning
                    : AppColors.error;
                const weekLabel = t.weekStart.slice(5);
                return (
                  <View key={t.weekStart} style={styles.trendBarContainer} accessibilityRole="text" accessibilityLabel={`Week ${weekLabel}: waste score ${t.wasteScore}`}>
                    <View style={[styles.trendBarTrack, { backgroundColor: theme.backgroundSecondary }]}>
                      <View
                        style={[styles.trendBarFill, { height: barHeight, backgroundColor: barColor }]}
                      />
                    </View>
                    <ThemedText type="caption" style={styles.trendBarLabel}>
                      {weekLabel}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </GlassCard>
        ) : null}

        {wasteSummary && wasteSummary.streak.currentStreak > 0 ? (
          <GlassCard style={styles.section} testID="section-streak">
            <View style={styles.streakHeader} accessibilityLabel={`${wasteSummary.streak.currentStreak} week streak of consecutive weeks with 80 or higher waste score`}>
              <Feather name="zap" size={24} color={AppColors.warning} />
              <View>
                <ThemedText type="h4" testID="text-streak-count">
                  {wasteSummary.streak.currentStreak} Week Streak
                </ThemedText>
                <ThemedText type="caption">
                  Consecutive weeks with 80+ waste score
                </ThemedText>
              </View>
            </View>
            {wasteSummary.streak.longestStreak > wasteSummary.streak.currentStreak ? (
              <View style={[styles.longestStreakBadge, { backgroundColor: `${AppColors.secondary}15` }]}>
                <Feather name="award" size={14} color={AppColors.secondary} />
                <ThemedText type="small" style={{ color: AppColors.secondary }} testID="text-longest-streak">
                  Best: {wasteSummary.streak.longestStreak} weeks
                </ThemedText>
              </View>
            ) : null}
          </GlassCard>
        ) : null}

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
              accessibilityRole="text"
              accessibilityLabel={`${freshCount} fresh items`}
            >
              <Feather
                name="check-circle"
                size={20}
                color={AppColors.success}
              />
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
              accessibilityRole="text"
              accessibilityLabel={`${expiringCount} expiring items`}
            >
              <Feather
                name="alert-triangle"
                size={20}
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
              accessibilityRole="text"
              accessibilityLabel={`${expiredCount} expired items`}
            >
              <Feather name="x-circle" size={20} color={AppColors.error} />
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
                  <View key={item.id} style={styles.timelineItem} accessibilityRole="text" accessibilityLabel={`${item.name}, expires ${daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : 'in ' + daysLeft + ' days'}, stored in ${item.storageLocation}`}>
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
                <View key={category} style={styles.categoryRow} accessibilityRole="text" accessibilityLabel={`${category}: ${count} items`}>
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
            <View style={styles.emptyState} accessibilityRole="text" accessibilityLabel="No categories yet. Add items to see category breakdown">
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
                <View
                  style={styles.wasteStatItem}
                  accessibilityRole="text"
                  accessibilityLabel={`${filteredWaste.length} items wasted`}
                >
                  <Feather name="trash-2" size={20} color={AppColors.error} />
                  <ThemedText type="h2" style={{ color: AppColors.error }}>
                    {filteredWaste.length}
                  </ThemedText>
                  <ThemedText type="caption">Items Wasted</ThemedText>
                </View>
                <View
                  style={styles.wasteStatItem}
                  accessibilityRole="text"
                  accessibilityLabel={`${filteredConsumed.length} items used`}
                >
                  <Feather
                    name="check-square"
                    size={20}
                    color={AppColors.success}
                  />
                  <ThemedText type="h2" style={{ color: AppColors.success }}>
                    {filteredConsumed.length}
                  </ThemedText>
                  <ThemedText type="caption">Items Used</ThemedText>
                </View>
              </View>
              <View style={styles.reasonBreakdown}>
                {Object.entries(wasteByReason).map(([reason, count]) => (
                  <View key={reason} style={styles.reasonRow} accessibilityRole="text" accessibilityLabel={`${reason}: ${count} items wasted`}>
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
            <View style={styles.emptyState} accessibilityRole="text" accessibilityLabel="No waste recorded. Great job keeping waste to a minimum">
              <Feather name="thumbs-up" size={32} color={AppColors.success} />
              <ThemedText
                type="body"
                style={{ fontWeight: Typography.button.fontWeight, marginTop: Spacing.sm }}
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
            <View
              style={styles.nutritionItem}
              accessibilityRole="text"
              accessibilityLabel={`${totalNutrition.calories.toLocaleString()} total calories`}
            >
              <Feather name="zap" size={20} color={AppColors.primary} />
              <ThemedText type="h2" style={{ color: AppColors.primary }}>
                {totalNutrition.calories.toLocaleString()}
              </ThemedText>
              <ThemedText type="caption">Total Calories</ThemedText>
            </View>
            <View
              style={styles.nutritionItem}
              accessibilityRole="text"
              accessibilityLabel={`approximately ${avgDailyCalories} daily average calories`}
            >
              <ThemedText type="h3" style={{ color: AppColors.secondary }}>
                ~{avgDailyCalories}
              </ThemedText>
              <ThemedText type="caption">Daily Avg</ThemedText>
            </View>
          </View>
          <View style={styles.macroGrid}>
            <View style={styles.macroItem} accessibilityRole="text" accessibilityLabel={`Protein: ${totalNutrition.protein} grams`}>
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
            <View style={styles.macroItem} accessibilityRole="text" accessibilityLabel={`Carbs: ${totalNutrition.carbs} grams`}>
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
            <View style={styles.macroItem} accessibilityRole="text" accessibilityLabel={`Fat: ${totalNutrition.fat} grams`}>
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
    borderRadius: BorderRadius.full,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeInner: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeScore: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  gaugeLabel: {
    marginTop: Spacing.md,
    fontWeight: Typography.button.fontWeight,
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
    borderRadius: BorderRadius.xs,
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
    borderRadius: BorderRadius.xs,
  },
  categoryCount: {
    width: 30,
    textAlign: "right",
    fontWeight: Typography.button.fontWeight,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
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
    backgroundColor: AppColors.border,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  reasonFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
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
    borderTopColor: AppColors.border,
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
  trendChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 100,
    paddingTop: Spacing.md,
  },
  trendBarContainer: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.xs,
  },
  trendBarTrack: {
    width: 16,
    height: 80,
    borderRadius: BorderRadius.sm,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendBarFill: {
    width: "100%",
    borderRadius: BorderRadius.sm,
  },
  trendBarLabel: {
    fontSize: 9,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  longestStreakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
  },
});
