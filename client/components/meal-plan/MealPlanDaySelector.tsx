import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { format, isSameDay } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";
import { MealPlan } from "@/lib/storage";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MealPlanDaySelectorProps {
  weekDays: Date[];
  selectedDay: Date;
  mealPlans: MealPlan[];
  onSelectDay: (day: Date) => void;
}

export function MealPlanDaySelector({
  weekDays,
  selectedDay,
  mealPlans,
  onSelectDay,
}: MealPlanDaySelectorProps) {
  const { theme, isDark, style: themeStyle } = useTheme();

  return (
    <View style={styles.weekGrid}>
      {weekDays.map((day, index) => {
        const isSelected = isSameDay(day, selectedDay);
        const isToday = isSameDay(day, new Date());
        const hasMeals = mealPlans.some(
          (p) =>
            p.date === format(day, "yyyy-MM-dd") &&
            Object.values(p.meals).some(Boolean),
        );

        const renderDayCardContent = () => (
          <>
            <ThemedText
              type="caption"
              style={{
                color: isSelected ? "#FFFFFF" : theme.textSecondary,
              }}
            >
              {DAYS[day.getDay()]}
            </ThemedText>
            <ThemedText
              type="h4"
              style={{ color: isSelected ? "#FFFFFF" : theme.text }}
            >
              {format(day, "d")}
            </ThemedText>
            {hasMeals ? (
              <View
                style={[
                  styles.mealIndicator,
                  {
                    backgroundColor: isSelected
                      ? "#FFFFFF"
                      : AppColors.success,
                  },
                ]}
              />
            ) : null}
          </>
        );

        if (isSelected) {
          return (
            <Pressable
              key={index}
              style={[
                styles.dayCard,
                {
                  backgroundColor: AppColors.primary,
                  borderColor: isToday ? AppColors.primary : "transparent",
                  borderWidth: isToday && !isSelected ? 2 : 0,
                  borderRadius: themeStyle.glassEffect.borderRadius.md,
                },
              ]}
              onPress={() => onSelectDay(day)}
              accessibilityRole="button"
              accessibilityLabel={`${DAYS[day.getDay()]} ${format(day, 'd')}, ${isToday ? 'today, ' : ''}${isSelected ? 'selected, ' : ''}${hasMeals ? 'has meals planned' : 'no meals planned'}`}
              accessibilityState={{ selected: isSelected }}
            >
              {renderDayCardContent()}
            </Pressable>
          );
        }

        if (Platform.OS === "ios") {
          const useLiquidGlass = isLiquidGlassAvailable();
          return (
            <Pressable
              key={index}
              onPress={() => onSelectDay(day)}
              style={[styles.dayCard, styles.dayCardGlass, { borderRadius: themeStyle.glassEffect.borderRadius.md }]}
              accessibilityRole="button"
              accessibilityLabel={`${DAYS[day.getDay()]} ${format(day, 'd')}, ${isToday ? 'today, ' : ''}${isSelected ? 'selected, ' : ''}${hasMeals ? 'has meals planned' : 'no meals planned'}`}
              accessibilityState={{ selected: isSelected }}
            >
              {useLiquidGlass ? (
                <GlassView
                  glassEffectStyle="regular"
                  style={[
                    StyleSheet.absoluteFill,
                    styles.dayCardBlur,
                    {
                      borderColor: isToday
                        ? AppColors.primary
                        : "transparent",
                      borderWidth: isToday ? 2 : 0,
                      borderRadius: themeStyle.glassEffect.borderRadius.md,
                    },
                  ]}
                />
              ) : (
                <BlurView
                  intensity={40}
                  tint={isDark ? "dark" : "light"}
                  style={[
                    StyleSheet.absoluteFill,
                    styles.dayCardBlur,
                    {
                      borderColor: isToday
                        ? AppColors.primary
                        : theme.glass.border,
                      borderWidth: isToday ? 2 : 1,
                      borderRadius: themeStyle.glassEffect.borderRadius.md,
                    },
                  ]}
                />
              )}
              {renderDayCardContent()}
            </Pressable>
          );
        }

        return (
          <Pressable
            key={index}
            style={[
              styles.dayCard,
              {
                backgroundColor: theme.glass.background,
                borderColor: isToday
                  ? AppColors.primary
                  : theme.glass.border,
                borderWidth: isToday ? 2 : 1,
                borderRadius: themeStyle.glassEffect.borderRadius.md,
              },
            ]}
            onPress={() => onSelectDay(day)}
            accessibilityRole="button"
            accessibilityLabel={`${DAYS[day.getDay()]} ${format(day, 'd')}, ${isToday ? 'today, ' : ''}${isSelected ? 'selected, ' : ''}${hasMeals ? 'has meals planned' : 'no meals planned'}`}
            accessibilityState={{ selected: isSelected }}
          >
            {renderDayCardContent()}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCard: {
    width: 44,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dayCardGlass: {
    backgroundColor: "transparent",
  },
  dayCardBlur: {},
  mealIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
