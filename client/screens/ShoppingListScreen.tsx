import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { useInstacart } from "@/hooks/useInstacart";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, ShoppingListItem } from "@/lib/storage";

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const {
    isConfigured: instacartConfigured,
    isLoading: instacartLoading,
    openShoppingLink,
  } = useInstacart();

  const menuItems: MenuItemConfig[] = [];

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

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

  const handleOrderOnInstacart = async () => {
    const itemsToOrder = items.filter((i) => !i.isChecked);
    if (itemsToOrder.length === 0) {
      Alert.alert(
        "No Items",
        "Add items to your shopping list to order on Instacart.",
      );
      return;
    }

    const products = itemsToOrder.map((item) => ({
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || "each",
    }));

    await openShoppingLink(products, "ChefSpAIce Shopping List");
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
          testID={`card-shopping-item-${item.id}`}
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
            testID={`button-delete-shopping-item-${item.id}`}
          >
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </Pressable>
      </GlassCard>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState} testID="container-empty-shopping">
      <Feather name="shopping-cart" size={64} color={theme.textSecondary} />
      <ThemedText
        type="h3"
        style={styles.emptyTitle}
        testID="text-empty-shopping-title"
      >
        Your list is empty
      </ThemedText>
      <ThemedText
        type="body"
        style={styles.emptySubtitle}
        testID="text-empty-shopping-subtitle"
      >
        Add missing ingredients from recipes to build your shopping list
      </ThemedText>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      testID="screen-shopping-list"
    >
      <ExpoGlassHeader
        title="Shopping"
        screenKey="shopping"
        showSearch={false}
        menuItems={menuItems}
      />
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
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
            <View style={styles.header} testID="container-shopping-header">
              <ThemedText type="body" testID="text-items-remaining">
                {uncheckedItems.length} items remaining
              </ThemedText>
              {checkedItems.length > 0 ? (
                <Pressable
                  onPress={handleClearChecked}
                  testID="button-clear-checked"
                >
                  <ThemedText type="small" style={{ color: AppColors.error }}>
                    Clear checked
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
      />

      {checkedItems.length > 0 && uncheckedItems.length === 0 ? (
        <View
          style={[
            styles.completedBanner,
            { backgroundColor: AppColors.success },
          ]}
          testID="container-completed-banner"
        >
          <Feather name="check-circle" size={24} color="#FFFFFF" />
          <ThemedText
            type="body"
            style={styles.completedText}
            testID="text-shopping-complete"
          >
            Shopping complete! All items checked off.
          </ThemedText>
        </View>
      ) : null}

      {uncheckedItems.length > 0 && instacartConfigured ? (
        <View
          style={[
            styles.instacartContainer,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <GlassButton
            onPress={handleOrderOnInstacart}
            disabled={instacartLoading}
            style={styles.instacartButton}
            testID="button-order-instacart"
          >
            <View style={styles.instacartButtonContent}>
              {instacartLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="shopping-bag" size={20} color="#FFFFFF" />
              )}
              <ThemedText type="body" style={styles.instacartButtonText}>
                {instacartLoading ? "Creating Link..." : "Order on Instacart"}
              </ThemedText>
            </View>
          </GlassButton>
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
  instacartContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: "transparent",
  },
  instacartButton: {
    backgroundColor: "#43B02A",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  instacartButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  instacartButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
