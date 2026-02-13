import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { SwipeableItemCard } from "./SwipeableItemCard";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { FoodItem } from "@/lib/storage";
import type { ThemeColors } from "@/lib/types";

interface GroupedSectionData {
  title: string;
  icon: string;
  key: string;
  items: FoodItem[];
  itemCount: number;
}

interface InventoryGroupSectionProps {
  section: GroupedSectionData;
  isCollapsed: boolean;
  onToggle: (key: string) => void;
  onConsumed: (item: FoodItem) => void;
  onWasted: (item: FoodItem) => void;
  onItemPress: (itemId: string) => void;
  theme: ThemeColors;
  showSwipeHintOnFirst?: boolean;
}

export function InventoryGroupSection({
  section,
  isCollapsed,
  onToggle,
  onConsumed,
  onWasted,
  onItemPress,
  theme,
  showSwipeHintOnFirst,
}: InventoryGroupSectionProps) {
  return (
    <GlassCard
      style={styles.groupCard}
      contentStyle={styles.groupCardContent}
      {...(Platform.OS === "web" ? { accessibilityRole: "listitem" as any } : {})}
      accessibilityLabel={`${section.title} group, ${section.itemCount} items`}
    >
      <Pressable
        style={styles.sectionHeader}
        onPress={() => onToggle(section.key)}
        testID={`button-toggle-section-${section.key}`}
        accessibilityRole="button"
        accessibilityLabel={`${section.title} section, ${section.itemCount} items, ${isCollapsed ? 'collapsed' : 'expanded'}`}
        accessibilityState={{ expanded: !isCollapsed }}
      >
        <View style={styles.sectionHeaderLeft}>
          <Feather
            name={section.icon as any}
            size={18}
            color={AppColors.primary}
          />
          <ThemedText type="h4" style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
          <View
            style={[
              styles.sectionCount,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {section.itemCount}
            </ThemedText>
          </View>
        </View>
        <Feather
          name={isCollapsed ? "chevron-down" : "chevron-up"}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      {!isCollapsed && section.items.length > 0 ? (
        <View style={styles.groupItems}>
          {section.items.map((item, index) => (
            <SwipeableItemCard
              key={item.id}
              item={item}
              onConsumed={onConsumed}
              onWasted={onWasted}
              onPress={onItemPress}
              theme={theme}
              showHint={showSwipeHintOnFirst && index === 0}
            />
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    marginBottom: Spacing.md,
  },
  groupCardContent: {
    padding: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  groupItems: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
});
