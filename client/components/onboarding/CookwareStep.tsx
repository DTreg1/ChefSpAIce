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
import { Appliance, EQUIPMENT_CATEGORIES, ICON_MAP } from "./onboarding-data";

interface CookwareStepProps {
  theme: any;
  appliances: Appliance[];
  selectedEquipmentIds: Set<number>;
  setSelectedEquipmentIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  equipmentSelectedCount: number;
  isAtEquipmentLimit: boolean;
  isPro: boolean;
  cookwareLimit: number;
  toggleAppliance: (id: number) => void;
  saving: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function CookwareStep({
  theme,
  appliances,
  selectedEquipmentIds,
  setSelectedEquipmentIds,
  equipmentSelectedCount,
  isAtEquipmentLimit,
  isPro,
  cookwareLimit,
  toggleAppliance,
  saving,
  onNext,
  onBack,
}: CookwareStepProps) {
  const groupedAppliances = EQUIPMENT_CATEGORIES.map((cat) => ({
    ...cat,
    appliances: appliances.filter(
      (a) => a.category.toLowerCase() === cat.id.toLowerCase(),
    ),
    selectedCount: appliances.filter(
      (a) =>
        a.category.toLowerCase() === cat.id.toLowerCase() &&
        selectedEquipmentIds.has(a.id),
    ).length,
  }));

  const toggleCategoryAll = (categoryId: string) => {
    const categoryApps = appliances.filter(
      (a) => a.category.toLowerCase() === categoryId.toLowerCase(),
    );
    const allSelected = categoryApps.every((a) =>
      selectedEquipmentIds.has(a.id),
    );

    setSelectedEquipmentIds((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        categoryApps.forEach((a) => newSet.delete(a.id));
      } else {
        categoryApps.forEach((a) => newSet.add(a.id));
      }
      return newSet;
    });

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.allCookwareHeader}>
        <View
          style={[
            styles.successIconContainer,
            { backgroundColor: `${AppColors.primary}15` },
          ]}
        >
          <Feather name="tool" size={36} color={AppColors.primary} />
        </View>
        <ThemedText style={styles.allCookwareTitle}>
          Your Kitchen Equipment
        </ThemedText>
        <ThemedText
          style={[styles.allCookwareSubtitle, { color: theme.textSecondary }]}
        >
          Select the cookware and appliances you have in your kitchen.
        </ThemedText>
      </View>

      <View style={styles.allCookwareStats}>
        <View
          style={[
            styles.statBadge,
            {
              backgroundColor: isAtEquipmentLimit
                ? `${AppColors.warning}15`
                : `${AppColors.primary}15`,
            },
          ]}
        >
          <Feather
            name="tool"
            size={14}
            color={isAtEquipmentLimit ? AppColors.warning : AppColors.primary}
          />
          <ThemedText
            style={[
              styles.statBadgeText,
              {
                color: isAtEquipmentLimit
                  ? AppColors.warning
                  : AppColors.primary,
              },
            ]}
          >
            {isPro
              ? `${equipmentSelectedCount} Cookware`
              : `${equipmentSelectedCount}/${cookwareLimit} Cookware`}
          </ThemedText>
        </View>
        {isAtEquipmentLimit && (
          <ThemedText
            style={[styles.limitWarning, { color: AppColors.warning }]}
          >
            Basic plan limit reached. Upgrade for unlimited cookware.
          </ThemedText>
        )}
      </View>

      <ScrollView
        style={styles.allCookwareList}
        contentContainerStyle={styles.allCookwareListContent}
        showsVerticalScrollIndicator={true}
      >
        {groupedAppliances.map((group) => {
          if (group.appliances.length === 0) return null;
          const allInGroupSelected =
            group.selectedCount === group.appliances.length;

          return (
            <GlassCard key={group.id} style={styles.cookwareCategorySection}>
              <View style={styles.cookwareCategoryHeader}>
                <View style={styles.cookwareCategoryLeft}>
                  <View
                    style={[
                      styles.cookwareCategoryIcon,
                      { backgroundColor: `${AppColors.primary}15` },
                    ]}
                  >
                    <Feather
                      name={ICON_MAP[group.icon] || "box"}
                      size={16}
                      color={AppColors.primary}
                    />
                  </View>
                  <ThemedText style={styles.cookwareCategoryTitle}>
                    {group.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.cookwareCategoryCount,
                      { color: theme.textSecondary },
                    ]}
                  >
                    ({group.selectedCount}/{group.appliances.length})
                  </ThemedText>
                </View>
                <Pressable onPress={() => toggleCategoryAll(group.id)} accessibilityRole="button" accessibilityLabel={`${allInGroupSelected ? "Deselect" : "Select"} all in ${group.id}`}>
                  <ThemedText
                    style={[
                      styles.cookwareCategoryToggle,
                      { color: AppColors.primary },
                    ]}
                  >
                    {allInGroupSelected ? "Deselect All" : "Select All"}
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.cookwareCategoryItems}>
                {group.appliances.map((appliance) => {
                  const isSelected = selectedEquipmentIds.has(appliance.id);
                  const isDisabled = !isSelected && isAtEquipmentLimit;
                  return (
                    <Pressable
                      key={appliance.id}
                      onPress={() => {
                        if (isDisabled) return;
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }
                        toggleAppliance(appliance.id);
                      }}
                      style={[
                        styles.cookwareChip,
                        {
                          backgroundColor: isSelected
                            ? `${AppColors.primary}20`
                            : theme.backgroundSecondary,
                          borderColor: isSelected
                            ? AppColors.primary
                            : theme.border,
                          opacity: isDisabled ? 0.4 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle ${appliance.name}`}
                      accessibilityState={{ disabled: isDisabled }}
                    >
                      <ThemedText
                        style={[
                          styles.cookwareChipText,
                          {
                            color: isSelected
                              ? AppColors.primary
                              : theme.text,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {appliance.name}
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
          );
        })}
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
            disabled={saving}
          >
            {saving ? "Saving..." : "Start Using App"}
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
  fixedFooter: {
    flexShrink: 0,
    paddingTop: Spacing.sm,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
  },
  allCookwareHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  allCookwareTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  allCookwareSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  allCookwareStats: {
    flexDirection: "column",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  limitWarning: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  statBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  allCookwareList: {
    flex: 1,
  },
  allCookwareListContent: {
    paddingBottom: Spacing.md,
  },
  cookwareCategorySection: {
    marginBottom: Spacing.lg,
  },
  cookwareCategoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cookwareCategoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cookwareCategoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cookwareCategoryTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cookwareCategoryCount: {
    fontSize: 13,
  },
  cookwareCategoryToggle: {
    fontSize: 13,
    fontWeight: "500",
  },
  cookwareCategoryItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  cookwareChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  cookwareChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
