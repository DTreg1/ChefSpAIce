import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";
import { format, addDays } from "date-fns";

interface MealPlanWeekNavProps {
  currentWeekStart: Date;
  canUseWeeklyPrepping: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function MealPlanWeekNav({
  currentWeekStart,
  canUseWeeklyPrepping,
  onPrevWeek,
  onNextWeek,
}: MealPlanWeekNavProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.weekNavigation}>
      <Pressable
        onPress={onPrevWeek}
        style={[
          styles.navButton,
          !canUseWeeklyPrepping && styles.navButtonLocked,
        ]}
        accessibilityRole="button"
        accessibilityLabel={canUseWeeklyPrepping ? "Go to previous week" : "Previous week, requires Pro upgrade"}
        accessibilityState={{ disabled: !canUseWeeklyPrepping }}
      >
        {!canUseWeeklyPrepping && (
          <View style={styles.navLockBadge}>
            <Feather name="lock" size={8} color="#FFFFFF" />
          </View>
        )}
        <Feather
          name="chevron-left"
          size={24}
          color={!canUseWeeklyPrepping ? theme.textSecondary : theme.text}
        />
      </Pressable>
      <View style={styles.weekTitleContainer}>
        <ThemedText type="h4">
          {format(currentWeekStart, "MMM d")} -{" "}
          {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
        </ThemedText>
        {!canUseWeeklyPrepping && (
          <View style={styles.weekProBadge}>
            <ThemedText type="small" style={styles.weekProBadgeText}>
              PRO
            </ThemedText>
          </View>
        )}
      </View>
      <Pressable
        onPress={onNextWeek}
        style={[
          styles.navButton,
          !canUseWeeklyPrepping && styles.navButtonLocked,
        ]}
        accessibilityRole="button"
        accessibilityLabel={canUseWeeklyPrepping ? "Go to next week" : "Next week, requires Pro upgrade"}
        accessibilityState={{ disabled: !canUseWeeklyPrepping }}
      >
        {!canUseWeeklyPrepping && (
          <View style={styles.navLockBadge}>
            <Feather name="lock" size={8} color="#FFFFFF" />
          </View>
        )}
        <Feather
          name="chevron-right"
          size={24}
          color={!canUseWeeklyPrepping ? theme.textSecondary : theme.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navButton: {
    padding: Spacing.sm,
    position: "relative",
  },
  navButtonLocked: {
    opacity: 0.6,
  },
  navLockBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: AppColors.warning,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  weekTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weekProBadge: {
    backgroundColor: AppColors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  weekProBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
