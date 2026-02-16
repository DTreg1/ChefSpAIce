import { View, StyleSheet, Dimensions } from "react-native";
import { SkeletonBox } from "@/components/SkeletonBox";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTENT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

function InventoryItemSkeleton() {
  const { theme, style: themeStyle } = useTheme();
  const itemWidth = CONTENT_WIDTH - Spacing.md * 2;

  return (
    <View
      style={[
        styles.inventoryItem,
        {
          backgroundColor: theme.glass.backgroundStrong,
          borderColor: theme.glass.border,
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
          <SkeletonBox width={60} height={24} borderRadius={8} />
        </View>
        <View style={styles.inventoryItemFooter}>
          <SkeletonBox width={100} height={12} borderRadius={6} />
          <SkeletonBox width={80} height={20} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

function InventorySectionSkeleton() {
  const { theme, style: themeStyle } = useTheme();

  return (
    <View
      style={[
        styles.inventorySection,
        {
          backgroundColor: theme.glass.background,
          borderColor: theme.glass.border,
          borderRadius: themeStyle.glassEffect.borderRadius.lg,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={80} height={20} borderRadius={6} />
          <SkeletonBox width={24} height={20} borderRadius={8} />
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

export function InventorySkeleton({ sectionCount = 3 }: { sectionCount?: number }) {
  return (
    <View style={styles.inventoryList} testID="skeleton-inventory">
      {Array.from({ length: sectionCount }).map((_, i) => (
        <InventorySectionSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
