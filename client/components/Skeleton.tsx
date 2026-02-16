import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  useReducedMotion,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style: extraStyle,
}: SkeletonBoxProps) {
  const { style: themeStyle } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (!reduceMotion) {
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 800 }),
        -1,
        true,
      );
    }
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const base = {
    width: width as import("react-native").DimensionValue,
    height,
    borderRadius,
    backgroundColor: themeStyle.glass.border,
  };

  if (reduceMotion) {
    return <View style={[base, { opacity: 0.5 }, extraStyle]} />;
  }

  return <Animated.View style={[base, animatedStyle, extraStyle]} />;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;
const CONTENT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

function RecipeCardSkeleton() {
  const { style: themeStyle } = useTheme();
  const cardContentWidth = CARD_WIDTH - Spacing.md * 2;

  return (
    <View
      style={[
        styles.recipeCard,
        {
          backgroundColor: themeStyle.glass.background,
          borderColor: themeStyle.glass.border,
          borderRadius: themeStyle.glassEffect.borderRadius.lg,
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

export function RecipeGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.recipeGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.recipeCardWrapper}>
          <RecipeCardSkeleton />
        </View>
      ))}
    </View>
  );
}

function InventoryItemSkeleton() {
  const { style: themeStyle } = useTheme();
  const itemWidth = CONTENT_WIDTH - Spacing.md * 2;

  return (
    <View
      style={[
        styles.inventoryItem,
        {
          backgroundColor: themeStyle.glass.backgroundStrong,
          borderColor: themeStyle.glass.border,
          borderRadius: themeStyle.glassEffect.borderRadius.md,
        },
      ]}
    >
      <View style={styles.inventoryItemContent}>
        <View style={styles.inventoryItemHeader}>
          <View style={{ flex: 1 }}>
            <SkeletonBox width={itemWidth * 0.5} height={18} borderRadius={6} />
            <View style={{ height: Spacing.xs }} />
            <SkeletonBox width={itemWidth * 0.35} height={14} borderRadius={6} />
          </View>
          <SkeletonBox width={60} height={24} borderRadius={BorderRadius.sm} />
        </View>
        <View style={styles.inventoryItemFooter}>
          <SkeletonBox width={100} height={12} borderRadius={6} />
          <SkeletonBox width={80} height={20} borderRadius={BorderRadius.sm} />
        </View>
      </View>
    </View>
  );
}

function InventorySectionSkeleton() {
  const { style: themeStyle } = useTheme();

  return (
    <View
      style={[
        styles.inventorySection,
        {
          backgroundColor: themeStyle.glass.background,
          borderColor: themeStyle.glass.border,
          borderRadius: themeStyle.glassEffect.borderRadius.lg,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={80} height={20} borderRadius={6} />
          <SkeletonBox width={24} height={20} borderRadius={BorderRadius.sm} />
        </View>
        <SkeletonBox width={20} height={20} borderRadius={10} />
      </View>
      <View style={styles.sectionItems}>
        <InventoryItemSkeleton />
        <InventoryItemSkeleton />
      </View>
    </View>
  );
}

export function InventoryListSkeleton({
  sectionCount = 3,
}: {
  sectionCount?: number;
}) {
  return (
    <View style={styles.inventoryList}>
      {Array.from({ length: sectionCount }).map((_, i) => (
        <InventorySectionSkeleton key={i} />
      ))}
    </View>
  );
}

export function RecipeDetailSkeleton() {
  const { style: themeStyle } = useTheme();
  const sectionWidth = CONTENT_WIDTH - Spacing.lg * 2;

  return (
    <View style={styles.recipeDetailContainer}>
      <SkeletonBox
        width={CONTENT_WIDTH}
        height={200}
        borderRadius={BorderRadius.lg}
      />

      <View style={styles.recipeDetailHeader}>
        <SkeletonBox width={CONTENT_WIDTH * 0.8} height={28} borderRadius={8} />
        <View style={{ height: Spacing.md }} />
        <SkeletonBox width={CONTENT_WIDTH} height={16} borderRadius={6} />
        <View style={{ height: Spacing.xs }} />
        <SkeletonBox width={CONTENT_WIDTH * 0.6} height={16} borderRadius={6} />

        <View style={styles.metaRow}>
          <SkeletonBox width={80} height={20} borderRadius={6} />
          <SkeletonBox width={80} height={20} borderRadius={6} />
          <SkeletonBox width={80} height={20} borderRadius={6} />
        </View>
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: themeStyle.glass.background,
            borderColor: themeStyle.glass.border,
            borderRadius: themeStyle.glassEffect.borderRadius.lg,
          },
        ]}
      >
        <SkeletonBox width={100} height={22} borderRadius={6} />
        <View style={{ height: Spacing.md }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.ingredientRow}>
            <SkeletonBox width={20} height={20} borderRadius={10} />
            <SkeletonBox width={sectionWidth * 0.8} height={16} borderRadius={6} />
          </View>
        ))}
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: themeStyle.glass.background,
            borderColor: themeStyle.glass.border,
            borderRadius: themeStyle.glassEffect.borderRadius.lg,
          },
        ]}
      >
        <SkeletonBox width={100} height={22} borderRadius={6} />
        <View style={{ height: Spacing.md }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.instructionRow}>
            <SkeletonBox width={24} height={24} borderRadius={12} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width={sectionWidth * 0.85} height={16} borderRadius={6} />
              <View style={{ height: Spacing.xs }} />
              <SkeletonBox width={sectionWidth * 0.6} height={16} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>
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
  inventoryList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  inventorySection: {
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionItems: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  inventoryItem: {
    borderWidth: 1,
    overflow: "hidden",
  },
  inventoryItemContent: {
    padding: Spacing.md,
  },
  inventoryItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  inventoryItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  recipeDetailContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  recipeDetailHeader: {
    gap: Spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  section: {
    padding: Spacing.lg,
    borderWidth: 1,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
});
