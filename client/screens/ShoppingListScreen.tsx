import React, { useState, useCallback } from "react";
import {
  View,
  ViewProps,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { syncManager } from "@/lib/sync-manager";
import { ShoppingListSkeleton } from "@/components/LoadingState";

import { GlassHeader } from "@/components/GlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { EmptyState } from "@/components/EmptyState";
import { useInstacart } from "@/hooks/useInstacart";
import { Spacing, BorderRadius, AppColors, Typography } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { storage, ShoppingListItem } from "@/lib/storage";


export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
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
    try { await syncManager.fullSync(); } catch { Alert.alert("Sync failed", "We'll try again shortly"); }
    await loadItems();
    setRefreshing(false);
  };

  const handleToggleItem = async (id: string) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item,
    );
    setItems(updatedItems);
    await storage.setShoppingList(updatedItems);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
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
      {...(Platform.OS === "web" ? { accessibilityRole: "listitem" as ViewProps["accessibilityRole"] } : {})}
      accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}${item.isChecked ? ', checked' : ''}`}
    >
      <GlassCard>
        <Pressable
          style={styles.listItem}
          onPress={() => handleToggleItem(item.id)}
          testID={`card-shopping-item-${item.id}`}
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}`}
          accessibilityState={{ checked: item.isChecked }}
          accessibilityHint="Double tap to toggle checked"
          accessibilityActions={[
            { name: "activate", label: item.isChecked ? "Mark unchecked" : "Mark checked" },
            { name: "delete", label: "Remove from list" },
          ]}
          onAccessibilityAction={(event) => {
            switch (event.nativeEvent.actionName) {
              case "activate":
                handleToggleItem(item.id);
                break;
              case "delete":
                handleDeleteItem(item.id);
                break;
            }
          }}
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
              <Feather name="check" size={14} color={theme.buttonText} />
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
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name} from shopping list`}
          >
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </Pressable>
      </GlassCard>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="shopping-cart"
      title="No shopping items yet"
      description="Plan your meals and generate a shopping list from your recipes."
      actionLabel="Browse Recipes"
      onAction={() => {
        navigation.getParent()?.dispatch(
          CommonActions.navigate({ name: "RecipesTab" })
        );
      }}
    />
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      testID="screen-shopping-list"
      accessibilityRole="none"
    >
      <GlassHeader
        title="Shopping"
        screenKey="shopping"
        showSearch={false}
        menuItems={menuItems}
        headerRight={
          <Pressable
            onPress={() => navigation.navigate("GrocerySearch" as never)}
            style={styles.searchButton}
            testID="button-grocery-search"
            accessibilityRole="button"
            accessibilityLabel="Browse and search groceries"
          >
            <Feather name="search" size={22} color={theme.text} />
          </Pressable>
        }
      />
      <FlashList
        accessibilityRole="list"
        accessibilityLabel="Shopping list items"
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
        ListEmptyComponent={loading ? <ShoppingListSkeleton count={5} /> : renderEmptyState()}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.header} testID="container-shopping-header">
              <ThemedText type="body" testID="text-items-remaining" accessibilityRole="text" accessibilityLabel={`${uncheckedItems.length} items remaining on your shopping list`}>
                {uncheckedItems.length} items remaining
              </ThemedText>
              {checkedItems.length > 0 ? (
                <Pressable
                  onPress={handleClearChecked}
                  testID="button-clear-checked"
                  accessibilityRole="button"
                  accessibilityLabel={`Clear ${checkedItems.length} checked items`}
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
          accessibilityRole="alert"
          accessibilityLabel="Shopping complete! All items checked off"
        >
          <Feather name="check-circle" size={24} color={theme.buttonText} />
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
            accessibilityLabel={instacartLoading ? "Creating Instacart link" : "Order unchecked items on Instacart"}
          >
            <View style={styles.instacartButtonContent}>
              {instacartLoading ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <Feather name="shopping-bag" size={20} color={theme.buttonText} />
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
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  completedText: {
    color: "#FFFFFF",
    fontWeight: Typography.button.fontWeight,
  },
  instacartContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: "transparent",
  },
  instacartButton: {
    backgroundColor: AppColors.instacartGreen,
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
    fontWeight: Typography.button.fontWeight,
  },
  searchButton: {
    padding: Spacing.xs,
  },
});
