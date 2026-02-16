import { View, StyleSheet, Dimensions } from "react-native";
import { SkeletonBox } from "@/components/Skeleton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTENT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

type LoadingVariant = "list" | "detail" | "card-grid" | "full-page";

interface LoadingStateProps {
  variant: LoadingVariant;
  count?: number;
}

export function LoadingState({ variant, count }: LoadingStateProps) {
  switch (variant) {
    case "list":
      return <ListSkeleton count={count ?? 6} />;
    case "detail":
      return <DetailSkeleton />;
    case "card-grid":
      return <CardGridSkeleton count={count ?? 4} />;
    case "full-page":
      return <FullPageSkeleton />;
    default:
      return <ListSkeleton count={6} />;
  }
}

function ListItemSkeleton() {
  const { style: themeStyle } = useTheme();
  const itemWidth = CONTENT_WIDTH - Spacing.md * 2;

  return (
    <View
      style={[
        styles.listItem,
        {
          backgroundColor: themeStyle.glass.backgroundStrong,
          borderColor: themeStyle.glass.border,
          borderRadius: themeStyle.glassEffect.borderRadius.md,
        },
      ]}
      testID="skeleton-list-item"
    >
      <View style={styles.listItemRow}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <SkeletonBox width={itemWidth * 0.5} height={16} borderRadius={6} />
          <SkeletonBox width={itemWidth * 0.35} height={13} borderRadius={6} />
        </View>
        <SkeletonBox width={60} height={24} borderRadius={BorderRadius.sm} />
      </View>
    </View>
  );
}

function ListSkeleton({ count }: { count: number }) {
  return (
    <View style={styles.listContainer} testID="loading-list">
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </View>
  );
}

function CardSkeleton() {
  const { style: themeStyle } = useTheme();
  const cardContentWidth = CARD_WIDTH - Spacing.md * 2;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: themeStyle.glass.background,
          borderColor: themeStyle.glass.border,
          borderRadius: themeStyle.glassEffect.borderRadius.lg,
        },
      ]}
      testID="skeleton-card"
    >
      <SkeletonBox width={CARD_WIDTH} height={100} borderRadius={0} />
      <View style={styles.cardContent}>
        <SkeletonBox width={cardContentWidth * 0.9} height={16} borderRadius={6} />
        <View style={{ height: Spacing.sm }} />
        <SkeletonBox width={cardContentWidth * 0.6} height={14} borderRadius={6} />
        <View style={{ height: Spacing.sm }} />
        <View style={styles.cardFooter}>
          <SkeletonBox width={60} height={20} borderRadius={BorderRadius.sm} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <View style={styles.cardGrid} testID="loading-card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.cardWrapper}>
          <CardSkeleton />
        </View>
      ))}
    </View>
  );
}

function DetailSkeleton() {
  const { style: themeStyle } = useTheme();

  return (
    <View style={styles.detailContainer} testID="loading-detail">
      <SkeletonBox width={CONTENT_WIDTH * 0.6} height={22} borderRadius={8} />
      <View style={{ height: Spacing.lg }} />

      <View
        style={[
          styles.detailSection,
          {
            backgroundColor: themeStyle.glass.background,
            borderColor: themeStyle.glass.border,
            borderRadius: themeStyle.glassEffect.borderRadius.lg,
          },
        ]}
      >
        <SkeletonBox width={CONTENT_WIDTH * 0.4} height={18} borderRadius={6} />
        <View style={{ height: Spacing.md }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.detailRow}>
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <SkeletonBox width={CONTENT_WIDTH * 0.5} height={15} borderRadius={6} />
              <SkeletonBox width={CONTENT_WIDTH * 0.3} height={13} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: Spacing.md }} />

      <View
        style={[
          styles.detailSection,
          {
            backgroundColor: themeStyle.glass.background,
            borderColor: themeStyle.glass.border,
            borderRadius: themeStyle.glassEffect.borderRadius.lg,
          },
        ]}
      >
        <SkeletonBox width={CONTENT_WIDTH * 0.35} height={18} borderRadius={6} />
        <View style={{ height: Spacing.md }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.detailRow}>
            <SkeletonBox width={24} height={24} borderRadius={12} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width={CONTENT_WIDTH * 0.7} height={14} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function FullPageSkeleton() {
  const { style: themeStyle } = useTheme();

  return (
    <View style={styles.fullPageContainer} testID="loading-full-page">
      <SkeletonBox width={CONTENT_WIDTH} height={180} borderRadius={BorderRadius.lg} />
      <View style={{ height: Spacing.lg }} />
      <SkeletonBox width={CONTENT_WIDTH * 0.7} height={24} borderRadius={8} />
      <View style={{ height: Spacing.md }} />
      <SkeletonBox width={CONTENT_WIDTH} height={16} borderRadius={6} />
      <View style={{ height: Spacing.xs }} />
      <SkeletonBox width={CONTENT_WIDTH * 0.8} height={16} borderRadius={6} />
      <View style={{ height: Spacing.xl }} />

      <View
        style={[
          styles.fullPageSection,
          {
            backgroundColor: themeStyle.glass.background,
            borderColor: themeStyle.glass.border,
            borderRadius: themeStyle.glassEffect.borderRadius.lg,
          },
        ]}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.detailRow}>
            <SkeletonBox width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <SkeletonBox width={CONTENT_WIDTH * 0.5} height={16} borderRadius={6} />
              <SkeletonBox width={CONTENT_WIDTH * 0.35} height={13} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  listItem: {
    borderWidth: 1,
    padding: Spacing.md,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: Spacing.lg,
  },
  card: {
    overflow: "hidden",
    borderWidth: 1,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailContainer: {
    padding: Spacing.lg,
  },
  detailSection: {
    padding: Spacing.lg,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  fullPageContainer: {
    padding: Spacing.lg,
  },
  fullPageSection: {
    padding: Spacing.lg,
    borderWidth: 1,
  },
});
