import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { BorderRadius } from "@/constants/theme";
import type { ThemeColors } from "@/lib/types";

interface RecipeHeroProps {
  imageUri?: string;
  title: string;
  theme: ThemeColors;
}

export function RecipeHero({ imageUri, title, theme }: RecipeHeroProps) {
  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={styles.heroImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel={`Photo of ${title}`}
        accessibilityRole="image"
      />
    );
  }

  return (
    <View
      style={[
        styles.heroPlaceholder,
        { backgroundColor: theme.backgroundDefault },
      ]}
      accessibilityRole="image"
      accessibilityLabel="No photo available for this recipe"
    >
      <Feather name="image" size={48} color={theme.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    height: 250,
    borderRadius: BorderRadius.lg,
    width: "100%",
  },
  heroPlaceholder: {
    height: 200,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
