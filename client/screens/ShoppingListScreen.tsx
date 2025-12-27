import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, ShoppingListItem } from "@/lib/storage";

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const list = await storage.getShoppingList();
    setItems(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  const handleToggleItem = async (id: string) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item,
    );
    setItems(updatedItems);
    await storage.setShoppingList(updatedItems);
  };

  const handleDeleteItem = async (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems);
    await storage.setShoppingList(updatedItems);
  };

  const handleClearChecked = () => {
    const checkedCount = items.filter((i) => i.isChecked).length;
    if (checkedCount === 0) return;

    Alert.alert(
      "Clear Checked Items",
      `Remove ${checkedCount} checked items from your shopping list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            const updatedItems = items.filter((item) => !item.isChecked);
            setItems(updatedItems);
            await storage.setShoppingList(updatedItems);
          },
        },
      ],
    );
  };

  const uncheckedItems = items.filter((i) => !i.isChecked);
  const checkedItems = items.filter((i) => i.isChecked);

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      layout={Layout.springify()}
    >
      <GlassCard>
        <Pressable
          style={styles.listItem}
          onPress={() => handleToggleItem(item.id)}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: item.isChecked
                  ? AppColors.success
                  : "transparent",
                borderColor: item.isChecked ? AppColors.success : theme.border,
              },
            ]}
          >
            {item.isChecked ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>
          <View style={styles.itemContent}>
            <ThemedText
              type="body"
              style={[styles.itemName, item.isChecked && styles.checkedText]}
            >
              {item.name}
            </ThemedText>
            <ThemedText
              type="caption"
              style={item.isChecked && styles.checkedText}
            >
              {item.quantity} {item.unit}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => handleDeleteItem(item.id)}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </Pressable>
      </GlassCard>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="shopping-cart" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={styles.emptyTitle}>
        Your list is empty
      </ThemedText>
      <ThemedText type="body" style={styles.emptySubtitle}>
        Add missing ingredients from recipes to build your shopping list
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={[...uncheckedItems, ...checkedItems]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.header}>
              <ThemedText type="body">
                {uncheckedItems.length} items remaining
              </ThemedText>
              {checkedItems.length > 0 ? (
                <Pressable onPress={handleClearChecked}>
                  <ThemedText type="small" style={{ color: AppColors.error }}>
                    Clear checked
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {checkedItems.length > 0 && uncheckedItems.length === 0 ? (
        <View
          style={[
            styles.completedBanner,
            { backgroundColor: AppColors.success },
          ]}
        >
          <Feather name="check-circle" size={24} color="#FFFFFF" />
          <ThemedText type="body" style={styles.completedText}>
            Shopping complete! All items checked off.
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    marginBottom: Spacing.xs,
  },
  checkedText: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  separator: {
    height: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    textAlign: "center",
    opacity: 0.7,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  completedText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
