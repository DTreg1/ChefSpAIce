import React from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { Appliance, STARTER_FOODS } from "./onboarding-data";

interface CompleteStepProps {
  theme: any;
  appliances: Appliance[];
  selectedEquipmentIds: Set<number>;
  selectedFoodIds: Set<string>;
  equipmentSelectedCount: number;
  foodSelectedCount: number;
  toggleAppliance: (id: number) => void;
  toggleFood: (id: string) => void;
  saving: boolean;
  onBack: () => void;
  onComplete: () => void;
}

export function CompleteStep({
  theme,
  appliances,
  selectedEquipmentIds,
  selectedFoodIds,
  equipmentSelectedCount,
  foodSelectedCount,
  toggleAppliance,
  toggleFood,
  saving,
  onBack,
  onComplete,
}: CompleteStepProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.summaryHeader}>
        <View
          style={[
            styles.summaryIconContainer,
            { backgroundColor: `${AppColors.success}15` },
          ]}
        >
          <Feather name="check-circle" size={48} color={AppColors.success} />
        </View>
        <ThemedText style={styles.summaryTitle}>You're All Set!</ThemedText>
        <ThemedText
          style={[styles.summarySubtitle, { color: theme.textSecondary }]}
        >
          {equipmentSelectedCount} equipment items and {foodSelectedCount}{" "}
          food items ready to go.
        </ThemedText>
      </View>

      <ScrollView
        style={styles.summaryList}
        showsVerticalScrollIndicator={false}
      >
        {appliances.length > 0 ? (
          <GlassCard style={styles.summaryCategoryCard}>
            <View style={styles.summaryCategoryHeader}>
              <Feather name="tool" size={20} color={AppColors.primary} />
              <ThemedText style={styles.summaryCategoryName}>
                Kitchen Equipment
              </ThemedText>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: `${AppColors.primary}15` },
                ]}
              >
                <ThemedText
                  style={[
                    styles.countBadgeText,
                    { color: AppColors.primary },
                  ]}
                >
                  {equipmentSelectedCount}
                </ThemedText>
              </View>
            </View>
            <View style={styles.summaryItems}>
              {appliances.map((a) => {
                const isSelected = selectedEquipmentIds.has(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                      }
                      toggleAppliance(a.id);
                    }}
                    style={[
                      styles.summaryItemChip,
                      {
                        backgroundColor: isSelected
                          ? `${AppColors.primary}20`
                          : theme.backgroundSecondary,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? AppColors.primary
                          : theme.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${a.name}`}
                  >
                    <ThemedText
                      style={[
                        styles.summaryItemText,
                        {
                          color: isSelected
                            ? AppColors.primary
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {a.name}
                    </ThemedText>
                    {isSelected ? (
                      <Feather
                        name="check"
                        size={12}
                        color={AppColors.primary}
                        style={{ marginLeft: 4 }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        ) : null}

        {STARTER_FOODS.length > 0 ? (
          <GlassCard style={styles.summaryCategoryCard}>
            <View style={styles.summaryCategoryHeader}>
              <Feather
                name="shopping-bag"
                size={20}
                color={AppColors.primary}
              />
              <ThemedText style={styles.summaryCategoryName}>
                Pantry Items
              </ThemedText>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: `${AppColors.primary}15` },
                ]}
              >
                <ThemedText
                  style={[
                    styles.countBadgeText,
                    { color: AppColors.primary },
                  ]}
                >
                  {foodSelectedCount}
                </ThemedText>
              </View>
            </View>
            <View style={styles.summaryItems}>
              {STARTER_FOODS.map((f) => {
                const isSelected = selectedFoodIds.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                      }
                      toggleFood(f.id);
                    }}
                    style={[
                      styles.summaryItemChip,
                      {
                        backgroundColor: isSelected
                          ? `${AppColors.primary}20`
                          : theme.backgroundSecondary,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? AppColors.primary
                          : theme.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${f.name}`}
                  >
                    <ThemedText
                      style={[
                        styles.summaryItemText,
                        {
                          color: isSelected
                            ? AppColors.primary
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {f.name}
                    </ThemedText>
                    {isSelected ? (
                      <Feather
                        name="check"
                        size={12}
                        color={AppColors.primary}
                        style={{ marginLeft: 4 }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        ) : null}
      </ScrollView>

      <View style={styles.summaryNote}>
        <Feather name="info" size={16} color={theme.textSecondary} />
        <ThemedText
          style={[styles.summaryNoteText, { color: theme.textSecondary }]}
        >
          You can update these anytime in Settings
        </ThemedText>
      </View>

      <View style={styles.summaryActions}>
        <GlassButton
          onPress={onBack}
          variant="secondary"
          style={styles.editButton}
        >
          Back
        </GlassButton>
        <GlassButton
          onPress={onComplete}
          variant="primary"
          disabled={saving}
          style={styles.completeButton}
        >
          {saving ? "Saving..." : "Start Using App"}
        </GlassButton>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  summaryHeader: {
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  summarySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  summaryList: {
    flex: 1,
  },
  summaryCategoryCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryCategoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  summaryItemChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  summaryItemText: {
    fontSize: 13,
  },
  summaryNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  summaryNoteText: {
    fontSize: 13,
  },
  summaryActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  editButton: {
    flex: 1,
  },
  completeButton: {
    flex: 2,
  },
});
