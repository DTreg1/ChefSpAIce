import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import type { Recipe } from "@/lib/storage";

interface RecipeCookwareSectionProps {
  recipe: Recipe;
  userCookware: string[];
  navigation: any;
  theme: any;
}

export function RecipeCookwareSection({
  recipe,
  userCookware,
  navigation,
  theme,
}: RecipeCookwareSectionProps) {
  if (
    (!recipe.requiredCookware || recipe.requiredCookware.length === 0) &&
    (!recipe.optionalCookware || recipe.optionalCookware.length === 0)
  ) {
    return null;
  }

  return (
    <GlassCard style={styles.cookwareSection}>
      <View style={styles.sectionHeader}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.xs,
          }}
        >
          <Feather name="tool" size={16} color={theme.text} />
          <ThemedText type="h4">Cookware</ThemedText>
        </View>
        <Pressable
          onPress={() =>
            navigation.navigate("CookwareTab", {
              screen: "Cookware",
            })
          }
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="View my cookware"
        >
          <ThemedText
            type="caption"
            style={{ color: AppColors.primary }}
          >
            My Cookware
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.cookwareList}>
        {recipe.requiredCookware?.map((eq, idx) => {
          const hasIt = userCookware.includes(eq.toLowerCase());
          return (
            <View
              key={`req-${idx}`}
              style={[
                styles.cookwareBadge,
                {
                  backgroundColor: hasIt
                    ? AppColors.success + "20"
                    : AppColors.warning + "20",
                },
              ]}
            >
              <Feather
                name={hasIt ? "check" : "alert-circle"}
                size={12}
                color={hasIt ? AppColors.success : AppColors.warning}
                style={{ marginRight: Spacing.xs }}
              />
              <ThemedText
                type="caption"
                style={{
                  color: hasIt ? AppColors.success : AppColors.warning,
                }}
              >
                {eq}
              </ThemedText>
            </View>
          );
        })}
        {recipe.optionalCookware?.map((eq, idx) => (
          <View
            key={`opt-${idx}`}
            style={[
              styles.cookwareBadge,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText type="caption">{eq} (optional)</ThemedText>
          </View>
        ))}
      </View>
      {recipe.requiredCookware?.some(
        (eq) => !userCookware.includes(eq.toLowerCase()),
      ) ? (
        <ThemedText type="caption" style={{ marginTop: Spacing.sm }}>
          Some cookware is missing. Check alternatives or update your
          cookware list.
        </ThemedText>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  cookwareSection: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cookwareList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  cookwareBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
