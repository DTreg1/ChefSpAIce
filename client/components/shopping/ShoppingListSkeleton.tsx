import { View, StyleSheet, Dimensions } from "react-native";
import { SkeletonBox } from "@/components/SkeletonBox";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, GlassEffect } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTENT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

function ShoppingItemSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.listItem,
        {
          backgroundColor: theme.glass.backgroundStrong,
          borderColor: theme.glass.border,
        },
      ]}
    >
      <View style={styles.listItemRow}>
        <SkeletonBox width={24} height={24} borderRadius={6} />
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <SkeletonBox width={CONTENT_WIDTH * 0.45} height={16} borderRadius={6} />
          <SkeletonBox width={CONTENT_WIDTH * 0.25} height={13} borderRadius={6} />
        </View>
        <SkeletonBox width={18} height={18} borderRadius={4} />
      </View>
    </View>
  );
}

export function ShoppingListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer} data-testid="skeleton-shopping-list">
      {Array.from({ length: count }).map((_, i) => (
        <ShoppingItemSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  listItem: {
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
});
