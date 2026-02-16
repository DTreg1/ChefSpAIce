import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { TermHighlighter, CookingTerm } from "./TermHighlighter";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { Recipe } from "@/lib/storage";
import type { ThemeColors } from "@/lib/types";

interface RecipeHeaderProps {
  recipe: Recipe;
  selectedServings: number;
  termHighlightingEnabled: boolean;
  onTermPress: (term: CookingTerm) => void;
  theme: ThemeColors;
}

export function RecipeHeader({
  recipe,
  selectedServings,
  termHighlightingEnabled,
  onTermPress,
  theme,
}: RecipeHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedText type="h2">{recipe.title}</ThemedText>
      <View style={styles.description}>
        {termHighlightingEnabled ? (
          <TermHighlighter
            text={recipe.description}
            onTermPress={onTermPress}
          />
        ) : (
          <ThemedText type="body">{recipe.description}</ThemedText>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem} accessibilityRole="text" accessibilityLabel={`Total time ${recipe.prepTime + recipe.cookTime} minutes`}>
          <Feather name="clock" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.metaText}>
            {recipe.prepTime + recipe.cookTime} min
          </ThemedText>
        </View>
        <View style={styles.metaItem} accessibilityRole="text" accessibilityLabel={`${selectedServings} serving${selectedServings !== 1 ? 's' : ''}`}>
          <Feather name="users" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.metaText}>
            {selectedServings} serving{selectedServings !== 1 ? "s" : ""}
          </ThemedText>
        </View>
        {recipe.cuisine ? (
          <View style={styles.metaItem} accessibilityRole="text" accessibilityLabel={`Cuisine: ${recipe.cuisine}`}>
            <Feather name="globe" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.metaText}>
              {recipe.cuisine}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {recipe.dietaryTags && recipe.dietaryTags.length > 0 ? (
        <View style={styles.tagRow}>
          {recipe.dietaryTags.map((tag) => (
            <View
              key={tag}
              style={[
                styles.tag,
                { backgroundColor: theme.backgroundDefault },
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Dietary tag: ${tag}`}
            >
              <ThemedText type="caption">{tag}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.sm,
  },
  description: {},
  metaRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {},
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
