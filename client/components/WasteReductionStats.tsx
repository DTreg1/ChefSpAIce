import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { WasteReductionStats as StatsType } from "@/lib/storage";
import { analytics } from "@/lib/analytics";

interface WasteReductionStatsProps {
  compact?: boolean;
}

const TIER_COLORS = {
  bronze: AppColors.medalBronze,
  silver: AppColors.medalSilver,
  gold: AppColors.medalGold,
  platinum: AppColors.medalPlatinum,
};

export function WasteReductionStats({
  compact = false,
}: WasteReductionStatsProps) {
  const { theme, style: themeStyle } = useTheme();
  const [stats, setStats] = useState<StatsType | null>(null);
  const [monthlyStats, setMonthlyStats] = useState({
    itemsSaved: 0,
    valueSaved: 0,
    recipesGenerated: 0,
  });
  const [showBadges, setShowBadges] = useState(false);

  const counterScale = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        const [allStats, monthly] = await Promise.all([
          analytics.getStats(),
          analytics.getMonthlyStats(),
        ]);
        setStats(allStats);
        setMonthlyStats(monthly);

        counterScale.value = withSequence(
          withSpring(1.1, { damping: 8 }),
          withSpring(1, { damping: 12 }),
        );
      };
      loadStats();
    }, [counterScale]),
  );

  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  if (!stats) {
    return null;
  }

  if (compact) {
    return (
      <GlassCard style={styles.compactCard}>
        <View style={styles.compactHeader}>
          <Feather name="trending-up" size={20} color={AppColors.success} />
          <ThemedText type="h4">Waste Reduction</ThemedText>
        </View>
        <View style={styles.compactStats}>
          <View
            style={styles.compactStatItem}
            accessibilityRole="text"
            accessibilityLabel={`${monthlyStats.itemsSaved} items saved this month`}
          >
            <Animated.View style={counterStyle}>
              <ThemedText type="h2" style={{ color: AppColors.success }}>
                {monthlyStats.itemsSaved}
              </ThemedText>
            </Animated.View>
            <ThemedText type="caption">Items saved this month</ThemedText>
          </View>
          <View
            style={styles.compactStatItem}
            accessibilityRole="text"
            accessibilityLabel={`$${monthlyStats.valueSaved.toFixed(0)} value saved`}
          >
            <ThemedText type="h2" style={{ color: AppColors.primary }}>
              ${monthlyStats.valueSaved.toFixed(0)}
            </ThemedText>
            <ThemedText type="caption">Value saved</ThemedText>
          </View>
        </View>
        {stats.currentStreak > 0 ? (
          <View
            style={[
              styles.streakBadge,
              { backgroundColor: `${AppColors.warning}15` },
            ]}
          >
            <Feather name="zap" size={14} color={AppColors.warning} />
            <ThemedText type="small" style={{ color: AppColors.warning }}>
              {stats.currentStreak} day streak
            </ThemedText>
          </View>
        ) : null}
      </GlassCard>
    );
  }

  return (
    <View style={styles.container}>
      <GlassCard style={styles.mainCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Feather name="award" size={20} color={AppColors.success} />
            <ThemedText type="h4">Your Impact</ThemedText>
          </View>
          {stats.badges.length > 0 ? (
            <Pressable
              style={styles.badgeButton}
              onPress={() => setShowBadges(!showBadges)}
              accessibilityRole="button"
              accessibilityLabel={showBadges ? "Hide earned badges" : "Show earned badges"}
            >
              <ThemedText type="small" style={{ color: AppColors.primary }}>
                {stats.badges.length} badge
                {stats.badges.length !== 1 ? "s" : ""}
              </ThemedText>
              <Feather
                name={showBadges ? "chevron-up" : "chevron-down"}
                size={16}
                color={AppColors.primary}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsGrid}>
          <View
            style={[styles.statCard, { backgroundColor: themeStyle.glass.backgroundSubtle }]}
            accessibilityRole="text"
            accessibilityLabel={`${stats.totalItemsSavedFromWaste} items saved from waste`}
          >
            <Animated.View style={counterStyle}>
              <ThemedText type="h2" style={{ color: AppColors.success }}>
                {stats.totalItemsSavedFromWaste}
              </ThemedText>
            </Animated.View>
            <ThemedText type="caption">Items saved from waste</ThemedText>
          </View>

          <View
            style={[styles.statCard, { backgroundColor: themeStyle.glass.backgroundSubtle }]}
            accessibilityRole="text"
            accessibilityLabel={`$${stats.estimatedValueSaved.toFixed(0)} estimated savings`}
          >
            <ThemedText type="h2" style={{ color: AppColors.primary }}>
              ${stats.estimatedValueSaved.toFixed(0)}
            </ThemedText>
            <ThemedText type="caption">Estimated savings</ThemedText>
          </View>
        </View>

        <View style={[styles.secondaryStats, { borderTopColor: themeStyle.glass.border }]}>
          <View
            style={styles.secondaryStat}
            accessibilityRole="text"
            accessibilityLabel={`${stats.recipesGeneratedWithExpiring} smart recipes`}
          >
            <Feather name="book-open" size={16} color={theme.textSecondary} />
            <ThemedText type="body">
              {stats.recipesGeneratedWithExpiring}
            </ThemedText>
            <ThemedText type="caption">Smart recipes</ThemedText>
          </View>

          <View
            style={styles.secondaryStat}
            accessibilityRole="text"
            accessibilityLabel={`${stats.currentStreak} day current streak`}
          >
            <Feather name="zap" size={16} color={AppColors.warning} />
            <ThemedText type="body">{stats.currentStreak}</ThemedText>
            <ThemedText type="caption">Current streak</ThemedText>
          </View>

          <View
            style={styles.secondaryStat}
            accessibilityRole="text"
            accessibilityLabel={`${stats.longestStreak} day best streak`}
          >
            <Feather name="trending-up" size={16} color={AppColors.secondary} />
            <ThemedText type="body">{stats.longestStreak}</ThemedText>
            <ThemedText type="caption">Best streak</ThemedText>
          </View>
        </View>

        {showBadges && stats.badges.length > 0 ? (
          <View style={[styles.badgesContainer, { borderTopColor: themeStyle.glass.border }]}>
            <ThemedText type="h4" style={styles.badgesTitle}>
              Earned Badges
            </ThemedText>
            <View style={styles.badgesList}>
              {stats.badges.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeItem,
                    { backgroundColor: `${TIER_COLORS[badge.tier]}20` },
                  ]}
                >
                  <View
                    style={[
                      styles.badgeIcon,
                      { backgroundColor: TIER_COLORS[badge.tier] },
                    ]}
                  >
                    <Feather
                      name={badge.iconName as keyof typeof Feather.glyphMap}
                      size={16}
                      color={theme.buttonText}
                    />
                  </View>
                  <View style={styles.badgeInfo}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {badge.name}
                    </ThemedText>
                    <ThemedText type="caption" style={{ opacity: 0.8 }}>
                      {badge.description}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.monthlyCard}>
        <View style={styles.monthlyHeader}>
          <Feather name="calendar" size={20} color={theme.textSecondary} />
          <ThemedText type="h4">This Month</ThemedText>
        </View>
        <View style={styles.monthlyStats}>
          <View
            style={styles.monthlyStatItem}
            accessibilityRole="text"
            accessibilityLabel={`${monthlyStats.itemsSaved} items saved this month`}
          >
            <ThemedText type="h3" style={{ color: AppColors.success }}>
              {monthlyStats.itemsSaved}
            </ThemedText>
            <ThemedText type="caption">Items saved</ThemedText>
          </View>
          <View
            style={styles.monthlyStatItem}
            accessibilityRole="text"
            accessibilityLabel={`$${monthlyStats.valueSaved.toFixed(0)} value saved this month`}
          >
            <ThemedText type="h3" style={{ color: AppColors.primary }}>
              ${monthlyStats.valueSaved.toFixed(0)}
            </ThemedText>
            <ThemedText type="caption">Value saved</ThemedText>
          </View>
          <View
            style={styles.monthlyStatItem}
            accessibilityRole="text"
            accessibilityLabel={`${monthlyStats.recipesGenerated} recipes this month`}
          >
            <ThemedText type="h3" style={{ color: AppColors.secondary }}>
              {monthlyStats.recipesGenerated}
            </ThemedText>
            <ThemedText type="caption">Recipes</ThemedText>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  mainCard: {
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badgeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  secondaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  secondaryStat: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  badgesContainer: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  badgesTitle: {
    marginBottom: 0,
  },
  badgesList: {
    gap: Spacing.sm,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  badgeIcon: {
    width: Spacing["2xl"] + Spacing.xs,
    height: Spacing["2xl"] + Spacing.xs,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInfo: {
    flex: 1,
  },
  monthlyCard: {
    gap: Spacing.md,
  },
  monthlyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  monthlyStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  monthlyStatItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  compactCard: {
    gap: Spacing.md,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  compactStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  compactStatItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: "center",
  },
});
