import { View, StyleSheet, Dimensions } from "react-native";
import { SkeletonBox } from "@/components/SkeletonBox";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, GlassEffect } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTENT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

function WeekNavSkeleton() {
  return (
    <View style={styles.weekNav}>
      <SkeletonBox width={32} height={32} borderRadius={8} />
      <SkeletonBox width={CONTENT_WIDTH * 0.5} height={20} borderRadius={6} />
      <SkeletonBox width={32} height={32} borderRadius={8} />
    </View>
  );
}

function DaySelectorSkeleton() {
  return (
    <View style={styles.daySelector}>
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={styles.dayCard}>
          <SkeletonBox width={24} height={12} borderRadius={4} />
          <SkeletonBox width={20} height={20} borderRadius={6} />
          <SkeletonBox width={6} height={6} borderRadius={3} />
        </View>
      ))}
    </View>
  );
}

function MealSlotSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={styles.mealSlot}>
      <View style={styles.mealHeader}>
        <SkeletonBox width={18} height={18} borderRadius={4} />
        <SkeletonBox width={70} height={14} borderRadius={6} />
      </View>
      <View
        style={[
          styles.mealContent,
          {
            backgroundColor: theme.glass.background,
            borderColor: theme.glass.border,
          },
        ]}
      >
        <View style={styles.mealContentInner}>
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <SkeletonBox width={CONTENT_WIDTH * 0.5} height={16} borderRadius={6} />
            <View style={styles.mealMeta}>
              <SkeletonBox width={14} height={14} borderRadius={4} />
              <SkeletonBox width={50} height={12} borderRadius={4} />
            </View>
          </View>
          <SkeletonBox width={20} height={20} borderRadius={10} />
        </View>
      </View>
    </View>
  );
}

function HintRowSkeleton() {
  return (
    <View style={styles.hintRow}>
      <SkeletonBox width={16} height={16} borderRadius={4} />
      <SkeletonBox width={CONTENT_WIDTH * 0.7} height={12} borderRadius={4} />
    </View>
  );
}

function SelectedDayCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.selectedDayCard,
        {
          backgroundColor: theme.glass.background,
          borderColor: theme.glass.border,
        },
      ]}
    >
      <SkeletonBox width={CONTENT_WIDTH * 0.55} height={20} borderRadius={6} />
      <MealSlotSkeleton />
      <MealSlotSkeleton />
      <MealSlotSkeleton />
    </View>
  );
}

function StatsCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.statsCard,
        {
          backgroundColor: theme.glass.background,
          borderColor: theme.glass.border,
        },
      ]}
    >
      <View style={styles.statsHeader}>
        <SkeletonBox width={90} height={20} borderRadius={6} />
        <SkeletonBox width={110} height={16} borderRadius={6} />
      </View>
      <View style={styles.statsGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.statItem}>
            <SkeletonBox width={36} height={28} borderRadius={6} />
            <SkeletonBox width={60} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function MealPlanSkeleton() {
  return (
    <View style={styles.container} testID="skeleton-meal-plan">
      <WeekNavSkeleton />
      <DaySelectorSkeleton />
      <HintRowSkeleton />
      <SelectedDayCardSkeleton />
      <StatsCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  weekNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCard: {
    width: 44,
    height: 72,
    borderRadius: GlassEffect.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  mealSlot: {
    gap: Spacing.sm,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mealContent: {
    padding: Spacing.md,
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: 1,
  },
  mealContentInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  selectedDayCard: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsCard: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
});
