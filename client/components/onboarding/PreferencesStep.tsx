import React from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  SERVING_SIZE_OPTIONS,
  DAILY_MEALS_OPTIONS,
  CUISINE_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
} from "./onboarding-data";

interface PreferencesStepProps {
  theme: any;
  servingSize: number;
  dailyMeals: number;
  selectedCuisines: Set<string>;
  dietaryPreferences: Set<string>;
  setServingSize: (v: number) => void;
  setDailyMeals: (v: number) => void;
  toggleCuisine: (id: string) => void;
  toggleDietaryPreference: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PreferencesStep({
  theme,
  servingSize,
  dailyMeals,
  selectedCuisines,
  dietaryPreferences,
  setServingSize,
  setDailyMeals,
  toggleCuisine,
  toggleDietaryPreference,
  onNext,
  onBack,
}: PreferencesStepProps) {
  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.fixedHeader}>
        <View style={styles.categoryTitleContainer}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <Feather name="sliders" size={28} color={AppColors.primary} />
          </View>
          <ThemedText style={styles.categoryTitle}>Your Preferences</ThemedText>
          <ThemedText
            style={[styles.categoryDescription, { color: theme.textSecondary }]}
          >
            Help us personalize your experience
          </ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.equipmentList}
        contentContainerStyle={styles.equipmentListContent}
        showsVerticalScrollIndicator={true}
      >
        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Household Size
          </ThemedText>
          <ThemedText
            style={[
              styles.preferenceSectionDesc,
              { color: theme.textSecondary },
            ]}
          >
            How many people are you cooking for?
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {SERVING_SIZE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setServingSize(option.value);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.preferenceOption,
                  {
                    backgroundColor:
                      servingSize === option.value
                        ? `${AppColors.primary}20`
                        : theme.backgroundSecondary,
                    borderColor:
                      servingSize === option.value
                        ? AppColors.primary
                        : theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select serving size ${option.label}`}
              >
                <ThemedText
                  style={[
                    styles.preferenceOptionText,
                    {
                      color:
                        servingSize === option.value
                          ? AppColors.primary
                          : theme.text,
                    },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Daily Meals
          </ThemedText>
          <ThemedText
            style={[
              styles.preferenceSectionDesc,
              { color: theme.textSecondary },
            ]}
          >
            How many meals do you typically have per day?
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {DAILY_MEALS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setDailyMeals(option.value);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.preferenceOption,
                  {
                    backgroundColor:
                      dailyMeals === option.value
                        ? `${AppColors.primary}20`
                        : theme.backgroundSecondary,
                    borderColor:
                      dailyMeals === option.value
                        ? AppColors.primary
                        : theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${option.label} daily meals`}
              >
                <ThemedText
                  style={[
                    styles.preferenceOptionText,
                    {
                      color:
                        dailyMeals === option.value
                          ? AppColors.primary
                          : theme.text,
                    },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Favorite Cuisines
          </ThemedText>
          <ThemedText
            style={[
              styles.preferenceSectionDesc,
              { color: theme.textSecondary },
            ]}
          >
            Select cuisines you enjoy cooking (select multiple)
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {CUISINE_OPTIONS.map((cuisine) => {
              const isSelected = selectedCuisines.has(cuisine.id);
              return (
                <Pressable
                  key={cuisine.id}
                  onPress={() => toggleCuisine(cuisine.id)}
                  style={[
                    styles.preferenceOption,
                    {
                      backgroundColor: isSelected
                        ? `${AppColors.primary}20`
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${cuisine.label} cuisine`}
                >
                  <Feather
                    name={cuisine.icon}
                    size={14}
                    color={isSelected ? AppColors.primary : theme.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={[
                      styles.preferenceOptionText,
                      { color: isSelected ? AppColors.primary : theme.text },
                    ]}
                  >
                    {cuisine.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Dietary Preferences
          </ThemedText>
          <ThemedText
            style={[
              styles.preferenceSectionDesc,
              { color: theme.textSecondary },
            ]}
          >
            Any dietary restrictions or preferences?
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {DIETARY_PREFERENCE_OPTIONS.map((pref) => {
              const isSelected = dietaryPreferences.has(pref.id);
              return (
                <Pressable
                  key={pref.id}
                  onPress={() => toggleDietaryPreference(pref.id)}
                  style={[
                    styles.preferenceOption,
                    {
                      backgroundColor: isSelected
                        ? `${AppColors.primary}20`
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${pref.label} dietary preference`}
                >
                  <Feather
                    name={pref.icon}
                    size={14}
                    color={isSelected ? AppColors.primary : theme.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={[
                      styles.preferenceOptionText,
                      { color: isSelected ? AppColors.primary : theme.text },
                    ]}
                  >
                    {pref.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <View style={styles.navigationButtons}>
          <GlassButton
            onPress={onBack}
            variant="secondary"
            style={styles.navButton}
          >
            Back
          </GlassButton>
          <GlassButton
            onPress={onNext}
            variant="primary"
            style={styles.navButton}
          >
            Continue
          </GlassButton>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  fixedHeader: {
    flexShrink: 0,
  },
  fixedFooter: {
    flexShrink: 0,
    paddingTop: Spacing.sm,
  },
  categoryTitleContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  categoryDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  equipmentList: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  equipmentListContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  preferenceSection: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  preferenceSectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: Spacing.xs,
  },
  preferenceSectionDesc: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  preferenceOptionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
  },
  preferenceOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
  },
  preferenceOptionText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
  },
});
