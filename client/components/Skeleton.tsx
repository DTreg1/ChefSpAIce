import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton as MotiSkeleton } from "@/components/AccessibleSkeleton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;
const CONTENT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

function RecipeCardSkeleton() {
  const { isDark, style: themeStyle } = useTheme();
  const colorMode = isDark ? "dark" : "light";
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
      <MotiSkeleton
        colorMode={colorMode}
        width={CARD_WIDTH}
        height={100}
        radius={0}
      />
      <View style={styles.recipeCardContent}>
        <MotiSkeleton
          colorMode={colorMode}
          width={cardContentWidth * 0.9}
          height={16}
          radius={6}
        />
        <View style={{ height: Spacing.sm }} />
        <MotiSkeleton
          colorMode={colorMode}
          width={cardContentWidth * 0.6}
          height={14}
          radius={6}
        />
        <View style={{ height: Spacing.sm }} />
        <View style={styles.recipeCardFooter}>
          <MotiSkeleton
            colorMode={colorMode}
            width={60}
            height={20}
            radius={BorderRadius.sm}
          />
          <MotiSkeleton
            colorMode={colorMode}
            width={24}
            height={24}
            radius={12}
          />
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
  const { isDark, style: themeStyle } = useTheme();
  const colorMode = isDark ? "dark" : "light";
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
            <MotiSkeleton
              colorMode={colorMode}
              width={itemWidth * 0.5}
              height={18}
              radius={6}
            />
            <View style={{ height: Spacing.xs }} />
            <MotiSkeleton
              colorMode={colorMode}
              width={itemWidth * 0.35}
              height={14}
              radius={6}
            />
          </View>
          <MotiSkeleton
            colorMode={colorMode}
            width={60}
            height={24}
            radius={BorderRadius.sm}
          />
        </View>
        <View style={styles.inventoryItemFooter}>
          <MotiSkeleton
            colorMode={colorMode}
            width={100}
            height={12}
            radius={6}
          />
          <MotiSkeleton
            colorMode={colorMode}
            width={80}
            height={20}
            radius={BorderRadius.sm}
          />
        </View>
      </View>
    </View>
  );
}

function InventorySectionSkeleton() {
  const { isDark, style: themeStyle } = useTheme();
  const colorMode = isDark ? "dark" : "light";

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
          <MotiSkeleton
            colorMode={colorMode}
            width={24}
            height={24}
            radius={12}
          />
          <MotiSkeleton
            colorMode={colorMode}
            width={80}
            height={20}
            radius={6}
          />
          <MotiSkeleton
            colorMode={colorMode}
            width={24}
            height={20}
            radius={BorderRadius.sm}
          />
        </View>
        <MotiSkeleton
          colorMode={colorMode}
          width={20}
          height={20}
          radius={10}
        />
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
  const { isDark, style: themeStyle } = useTheme();
  const colorMode = isDark ? "dark" : "light";
  const sectionWidth = CONTENT_WIDTH - Spacing.lg * 2;

  return (
    <View style={styles.recipeDetailContainer}>
      <MotiSkeleton
        colorMode={colorMode}
        width={CONTENT_WIDTH}
        height={200}
        radius={BorderRadius.lg}
      />

      <View style={styles.recipeDetailHeader}>
        <MotiSkeleton
          colorMode={colorMode}
          width={CONTENT_WIDTH * 0.8}
          height={28}
          radius={8}
        />
        <View style={{ height: Spacing.md }} />
        <MotiSkeleton
          colorMode={colorMode}
          width={CONTENT_WIDTH}
          height={16}
          radius={6}
        />
        <View style={{ height: Spacing.xs }} />
        <MotiSkeleton
          colorMode={colorMode}
          width={CONTENT_WIDTH * 0.6}
          height={16}
          radius={6}
        />

        <View style={styles.metaRow}>
          <MotiSkeleton
            colorMode={colorMode}
            width={80}
            height={20}
            radius={6}
          />
          <MotiSkeleton
            colorMode={colorMode}
            width={80}
            height={20}
            radius={6}
          />
          <MotiSkeleton
            colorMode={colorMode}
            width={80}
            height={20}
            radius={6}
          />
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
        <MotiSkeleton
          colorMode={colorMode}
          width={100}
          height={22}
          radius={6}
        />
        <View style={{ height: Spacing.md }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.ingredientRow}>
            <MotiSkeleton
              colorMode={colorMode}
              width={20}
              height={20}
              radius={10}
            />
            <MotiSkeleton
              colorMode={colorMode}
              width={sectionWidth * 0.8}
              height={16}
              radius={6}
            />
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
        <MotiSkeleton
          colorMode={colorMode}
          width={100}
          height={22}
          radius={6}
        />
        <View style={{ height: Spacing.md }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.instructionRow}>
            <MotiSkeleton
              colorMode={colorMode}
              width={24}
              height={24}
              radius={12}
            />
            <View style={{ flex: 1 }}>
              <MotiSkeleton
                colorMode={colorMode}
                width={sectionWidth * 0.85}
                height={16}
                radius={6}
              />
              <View style={{ height: Spacing.xs }} />
              <MotiSkeleton
                colorMode={colorMode}
                width={sectionWidth * 0.6}
                height={16}
                radius={6}
              />
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
