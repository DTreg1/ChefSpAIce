import { View, StyleSheet, Dimensions } from "react-native";
import { SkeletonBox } from "@/components/SkeletonBox";
import { useAppTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, GlassEffect } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

function RecipeCardSkeleton() {
  const { theme } = useAppTheme();
  const cardContentWidth = CARD_WIDTH - Spacing.md * 2;

  return (
    <View
      style={[
        styles.recipeCard,
        {
          backgroundColor: theme.glass.background,
          borderColor: theme.glass.border,
        },
      ]}
    >
      <SkeletonBox width={CARD_WIDTH} height={100} borderRadius={0} />
      <View style={styles.recipeCardContent}>
        <SkeletonBox width={cardContentWidth * 0.9} height={16} borderRadius={6} />
        <View style={{ height: Spacing.sm }} />
        <SkeletonBox width={cardContentWidth * 0.6} height={14} borderRadius={6} />
        <View style={{ height: Spacing.sm }} />
        <View style={styles.recipeCardFooter}>
          <SkeletonBox width={60} height={20} borderRadius={BorderRadius.sm} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function RecipesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.recipeGrid} data-testid="skeleton-recipes">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.recipeCardWrapper}>
          <RecipeCardSkeleton />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  recipeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
  },
  recipeCardWrapper: {
    width: CARD_WIDTH,
    marginRight: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  recipeCard: {
    borderRadius: GlassEffect.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
  },
  recipeCardContent: {
    padding: Spacing.md,
  },
  recipeCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
