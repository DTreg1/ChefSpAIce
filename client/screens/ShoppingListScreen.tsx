import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, Alert, Linking, Platform } from "react-native";
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
import { storage, ShoppingListItem, InstacartSettings } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { useGuestLimits } from "@/contexts/GuestLimitsContext";


export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isGuest, isInstacartEnabled, showUpgradePrompt } = useGuestLimits();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [instacartSettings, setInstacartSettings] = useState<InstacartSettings | null>(null);
  const [sendingToInstacart, setSendingToInstacart] = useState(false);

  const loadItems = useCallback(async () => {
    const [list, instacart] = await Promise.all([
      storage.getShoppingList(),
      storage.getInstacartSettings(),
    ]);
    setItems(list);
    setInstacartSettings(instacart);
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

  const handleSendToInstacart = async () => {
    if (!isInstacartEnabled) {
      showUpgradePrompt("instacart");
      return;
    }

    const uncheckedItems = items.filter((i) => !i.isChecked);
    if (uncheckedItems.length === 0) {
      Alert.alert("No Items", "Add items to your shopping list first.");
      return;
    }

    setSendingToInstacart(true);

    try {
      const response = await fetch(`${getApiUrl()}api/instacart/status`);
      const status = await response.json();

      if (!status.configured) {
        Alert.alert(
          "Instacart Not Available",
          "Instacart integration is not yet configured. Please check back later."
        );
        setSendingToInstacart(false);
        return;
      }

      const listResponse = await fetch(`${getApiUrl()}api/instacart/create-shopping-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "ChefSpAIce Shopping List",
          items: uncheckedItems.map((item) => ({
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || undefined,
            display_text: `${item.quantity || 1}${item.unit ? ` ${item.unit}` : ""} ${item.name}`,
          })),
        }),
      });

      const result = await listResponse.json();

      if (result.success && result.shoppingListUrl) {
        if (Platform.OS === "web") {
          window.open(result.shoppingListUrl, "_blank");
        } else {
          await Linking.openURL(result.shoppingListUrl);
        }
      } else {
        Alert.alert("Error", result.message || result.error || "Failed to create Instacart shopping list.");
      }
    } catch (error) {
      console.error("Instacart error:", error);
      Alert.alert("Error", "Failed to connect to Instacart. Please try again.");
    } finally {
      setSendingToInstacart(false);
    }
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

      {uncheckedItems.length > 0 ? (
        <View style={[styles.instacartButtonContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Button
            onPress={handleSendToInstacart}
            loading={sendingToInstacart}
            disabled={sendingToInstacart}
            icon={<Feather name={isGuest ? "lock" : "shopping-bag"} size={18} color="#FFFFFF" />}
            style={[styles.instacartButton, { backgroundColor: isGuest ? theme.textSecondary : "#003D29" }]}
            data-testid="button-send-to-instacart"
          >
            <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {isGuest ? "Create Account for Instacart" : "Send to Instacart"}
            </ThemedText>
          </Button>
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
  instacartButtonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: "transparent",
  },
  instacartButton: {
    borderRadius: BorderRadius.md,
  },
});
