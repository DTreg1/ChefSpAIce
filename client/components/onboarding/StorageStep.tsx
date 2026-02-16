import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { DEFAULT_STORAGE_AREAS } from "./onboarding-data";

interface StorageStepProps {
  theme: any;
  selectedStorageAreas: Set<string>;
  toggleStorageArea: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StorageStep({
  theme,
  selectedStorageAreas,
  toggleStorageArea,
  onNext,
  onBack,
}: StorageStepProps) {
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
            <Feather name="box" size={28} color={AppColors.primary} />
          </View>
          <ThemedText style={styles.categoryTitle}>Storage Areas</ThemedText>
          <ThemedText
            style={[styles.categoryDescription, { color: theme.textSecondary }]}
          >
            Where do you store your food?
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
            Select Your Storage Areas
          </ThemedText>
          <ThemedText
            style={[
              styles.preferenceSectionDesc,
              { color: theme.textSecondary },
            ]}
          >
            Choose which storage areas you have in your kitchen
          </ThemedText>
          <View style={styles.storageAreasGrid}>
            {DEFAULT_STORAGE_AREAS.map((area) => {
              const isSelected = selectedStorageAreas.has(area.id);
              return (
                <Pressable
                  key={area.id}
                  onPress={() => toggleStorageArea(area.id)}
                  style={[
                    styles.storageAreaCard,
                    {
                      backgroundColor: isSelected
                        ? `${AppColors.primary}15`
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${area.label} storage area`}
                >
                  <View
                    style={[
                      styles.storageAreaIcon,
                      {
                        backgroundColor: isSelected
                          ? AppColors.primary
                          : theme.backgroundTertiary,
                      },
                    ]}
                  >
                    <Feather
                      name={area.icon}
                      size={24}
                      color={isSelected ? theme.buttonText : theme.textSecondary}
                    />
                  </View>
                  <ThemedText style={styles.storageAreaLabel}>
                    {area.label}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.storageAreaDesc,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {area.description}
                  </ThemedText>
                  {isSelected && (
                    <View
                      style={[
                        styles.storageCheckmark,
                        { backgroundColor: AppColors.primary },
                      ]}
                    >
                      <Feather name="check" size={12} color={theme.buttonText} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <View style={styles.storageNote}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText
            style={[styles.storageNoteText, { color: theme.textSecondary }]}
          >
            You can add custom storage areas later in Settings
          </ThemedText>
        </View>
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
            disabled={selectedStorageAreas.size === 0}
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
  storageAreasGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.md,
  },
  storageAreaCard: {
    width: "47%" as const,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  storageAreaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  storageAreaLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    marginBottom: Spacing.xs,
  },
  storageAreaDesc: {
    fontSize: 12,
    textAlign: "center" as const,
  },
  storageCheckmark: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  storageNote: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  storageNoteText: {
    fontSize: 13,
    flex: 1,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
  },
});
