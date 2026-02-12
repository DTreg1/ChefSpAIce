import React, { useState, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, ShoppingListItem, generateId } from "@/lib/storage";

const productImages: Record<string, any> = {
  whole_milk_bottle_icon: require("@/assets/food-images/whole_milk_bottle_icon.png"),
  water_bottle_icon: require("@/assets/food-images/water_bottle_icon.png"),
  fresh_strawberries_icon: require("@/assets/food-images/fresh_strawberries_icon.png"),
  fresh_eggs_icon: require("@/assets/food-images/fresh_eggs_icon.png"),
  chicken_breast_icon: require("@/assets/food-images/chicken_breast_icon.png"),
  yellow_bananas_icon: require("@/assets/food-images/yellow_bananas_icon.png"),
  ground_beef_icon: require("@/assets/food-images/ground_beef_icon.png"),
  white_bread_loaf_icon: require("@/assets/food-images/white_bread_loaf_icon.png"),
  salmon_fillet_icon: require("@/assets/food-images/salmon_fillet_icon.png"),
  avocado_icon: require("@/assets/food-images/avocado_icon.png"),
  green_broccoli_icon: require("@/assets/food-images/green_broccoli_icon.png"),
  plain_yogurt_icon: require("@/assets/food-images/plain_yogurt_icon.png"),
  red_tomatoes_icon: require("@/assets/food-images/red_tomatoes_icon.png"),
  pasta_spaghetti_icon: require("@/assets/food-images/pasta_spaghetti_icon.png"),
  cheddar_cheese_icon: require("@/assets/food-images/cheddar_cheese_icon.png"),
  butter_stick_icon: require("@/assets/food-images/butter_stick_icon.png"),
  white_rice_icon: require("@/assets/food-images/white_rice_icon.png"),
  russet_potatoes_icon: require("@/assets/food-images/russet_potatoes_icon.png"),
  orange_carrots_icon: require("@/assets/food-images/orange_carrots_icon.png"),
  yellow_onions_icon: require("@/assets/food-images/yellow_onions_icon.png"),
  red_apples_icon: require("@/assets/food-images/red_apples_icon.png"),
  orange_juice_glass_icon: require("@/assets/food-images/orange_juice_glass_icon.png"),
  fresh_flowers_icon: require("@/assets/food-images/fresh_flowers_icon.png"),
  tofu_block_icon: require("@/assets/food-images/tofu_block_icon.png"),
};

interface GroceryProduct {
  id: string;
  name: string;
  imageKey: string;
  category: string;
  defaultUnit: string;
}

const TOP_SEARCHES: GroceryProduct[] = [
  { id: "milk", name: "Milk", imageKey: "whole_milk_bottle_icon", category: "Dairy", defaultUnit: "gallon" },
  { id: "water", name: "Water", imageKey: "water_bottle_icon", category: "Beverages", defaultUnit: "bottle" },
  { id: "strawberries", name: "Strawberries", imageKey: "fresh_strawberries_icon", category: "Produce", defaultUnit: "lb" },
  { id: "eggs", name: "Eggs", imageKey: "fresh_eggs_icon", category: "Dairy", defaultUnit: "dozen" },
  { id: "chicken-breast", name: "Chicken Breast", imageKey: "chicken_breast_icon", category: "Meat", defaultUnit: "lb" },
  { id: "bananas", name: "Bananas", imageKey: "yellow_bananas_icon", category: "Produce", defaultUnit: "bunch" },
  { id: "ground-beef", name: "Ground Beef", imageKey: "ground_beef_icon", category: "Meat", defaultUnit: "lb" },
  { id: "bread", name: "Bread", imageKey: "white_bread_loaf_icon", category: "Bakery", defaultUnit: "loaf" },
];

const TRENDING: GroceryProduct[] = [
  { id: "salmon", name: "Salmon", imageKey: "salmon_fillet_icon", category: "Seafood", defaultUnit: "lb" },
  { id: "avocado", name: "Avocado", imageKey: "avocado_icon", category: "Produce", defaultUnit: "each" },
  { id: "broccoli", name: "Broccoli", imageKey: "green_broccoli_icon", category: "Produce", defaultUnit: "head" },
  { id: "yogurt", name: "Yogurt", imageKey: "plain_yogurt_icon", category: "Dairy", defaultUnit: "cup" },
  { id: "tomatoes", name: "Tomatoes", imageKey: "red_tomatoes_icon", category: "Produce", defaultUnit: "lb" },
  { id: "pasta", name: "Pasta", imageKey: "pasta_spaghetti_icon", category: "Grains", defaultUnit: "box" },
];

const ADDITIONAL: GroceryProduct[] = [
  { id: "cheese", name: "Cheese", imageKey: "cheddar_cheese_icon", category: "Dairy", defaultUnit: "block" },
  { id: "butter", name: "Butter", imageKey: "butter_stick_icon", category: "Dairy", defaultUnit: "stick" },
  { id: "rice", name: "Rice", imageKey: "white_rice_icon", category: "Grains", defaultUnit: "lb" },
  { id: "potatoes", name: "Potatoes", imageKey: "russet_potatoes_icon", category: "Produce", defaultUnit: "lb" },
  { id: "carrots", name: "Carrots", imageKey: "orange_carrots_icon", category: "Produce", defaultUnit: "lb" },
  { id: "onions", name: "Onions", imageKey: "yellow_onions_icon", category: "Produce", defaultUnit: "each" },
  { id: "apples", name: "Apples", imageKey: "red_apples_icon", category: "Produce", defaultUnit: "lb" },
  { id: "orange-juice", name: "Orange Juice", imageKey: "orange_juice_glass_icon", category: "Beverages", defaultUnit: "carton" },
  { id: "flowers", name: "Flowers", imageKey: "fresh_flowers_icon", category: "Other", defaultUnit: "bouquet" },
  { id: "tofu", name: "Tofu", imageKey: "tofu_block_icon", category: "Protein", defaultUnit: "block" },
];

const ALL_PRODUCTS = [...TOP_SEARCHES, ...TRENDING, ...ADDITIONAL];

function AddedOverlay() {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(300)}
      style={styles.addedOverlay}
    >
      <View style={styles.addedCheckContainer}>
        <Feather name="check" size={24} color="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

export default function GrocerySearchScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());

  const glassBg =
    typeof theme.glass?.background === "string"
      ? theme.glass.background
      : "rgba(255,255,255,0.1)";
  const glassBorder =
    typeof theme.glass?.border === "string"
      ? theme.glass.border
      : "rgba(255,255,255,0.2)";
  const textColor = typeof theme.text === "string" ? theme.text : "#000";
  const secondaryColor =
    typeof theme.textSecondary === "string" ? theme.textSecondary : "#888";

  const handleAddToList = useCallback(async (product: GroceryProduct) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const item: ShoppingListItem = {
      id: generateId(),
      name: product.name,
      quantity: 1,
      unit: product.defaultUnit,
      isChecked: false,
      category: product.category,
    };

    await storage.addShoppingListItem(item);

    setAddedProductIds((prev) => {
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });

    setTimeout(() => {
      setAddedProductIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1200);
  }, []);

  const filteredProducts = searchQuery.trim()
    ? ALL_PRODUCTS.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const isSearching = searchQuery.trim().length > 0;

  const renderTopSearchItem = (product: GroceryProduct) => (
    <Pressable
      key={product.id}
      style={styles.topSearchItem}
      onPress={() => handleAddToList(product)}
      testID={`button-add-product-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Add ${product.name} to shopping list`}
    >
      <View style={[styles.topSearchImageContainer, { backgroundColor: glassBg, borderColor: glassBorder }]}>
        <Image
          source={productImages[product.imageKey]}
          style={styles.topSearchImage}
          resizeMode="contain"
        />
        {addedProductIds.has(product.id) && <AddedOverlay />}
      </View>
      <ThemedText type="caption" style={styles.topSearchLabel} numberOfLines={2}>
        {product.name}
      </ThemedText>
    </Pressable>
  );

  const renderTrendingItem = (product: GroceryProduct) => (
    <Pressable
      key={product.id}
      style={styles.trendingItem}
      onPress={() => handleAddToList(product)}
      testID={`button-add-trending-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Add ${product.name} to shopping list`}
    >
      <GlassCard
        intensity="subtle"
        contentStyle={styles.trendingCardContent}
      >
        <View style={styles.trendingImageContainer}>
          <Image
            source={productImages[product.imageKey]}
            style={styles.trendingImage}
            resizeMode="contain"
          />
          {addedProductIds.has(product.id) && <AddedOverlay />}
        </View>
        <ThemedText type="small" style={styles.trendingLabel} numberOfLines={2}>
          {product.name}
        </ThemedText>
      </GlassCard>
    </Pressable>
  );

  const renderSearchResultItem = (product: GroceryProduct) => (
    <Animated.View
      key={product.id}
      entering={FadeIn.duration(200)}
    >
      <GlassCard intensity="subtle">
        <View style={styles.searchResultRow}>
          <View style={styles.searchResultLeft}>
            <Image
              source={productImages[product.imageKey]}
              style={styles.searchResultImage}
              resizeMode="contain"
            />
            <View style={styles.searchResultInfo}>
              <ThemedText type="body" testID={`text-product-name-${product.id}`}>
                {product.name}
              </ThemedText>
              <ThemedText type="caption">
                {product.category}
              </ThemedText>
            </View>
          </View>
          <GlassButton
            variant="primary"
            onPress={() => handleAddToList(product)}
            testID={`button-add-search-result-${product.id}`}
            accessibilityLabel={`Add ${product.name} to shopping list`}
            style={styles.addButton}
          >
            {addedProductIds.has(product.id) ? "Added" : "Add"}
          </GlassButton>
        </View>
      </GlassCard>
    </Animated.View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      testID="screen-grocery-search"
    >
      <ExpoGlassHeader
        title="Search"
        screenKey="grocery-search"
        showSearch={false}
        showMenu={false}
        showBackButton={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlassCard intensity="subtle" contentStyle={styles.searchBarContent}>
          <View style={styles.searchBarRow}>
            <Feather name="search" size={20} color={secondaryColor} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search products and recipes"
              placeholderTextColor={secondaryColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              testID="input-grocery-search"
              accessibilityLabel="Search products and recipes"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                testID="button-clear-search"
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Feather name="x" size={18} color={secondaryColor} />
              </Pressable>
            )}
          </View>
        </GlassCard>

        {isSearching ? (
          <View style={styles.searchResults}>
            {filteredProducts.length > 0 ? (
              <>
                <ThemedText type="h4" style={styles.sectionTitle} testID="text-search-results-count">
                  {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""}
                </ThemedText>
                <View style={styles.searchResultsList}>
                  {filteredProducts.map(renderSearchResultItem)}
                </View>
              </>
            ) : (
              <View style={styles.noResults}>
                <Feather name="search" size={48} color={secondaryColor} />
                <ThemedText type="body" style={styles.noResultsText}>
                  No products found
                </ThemedText>
                <ThemedText type="caption">
                  Try a different search term
                </ThemedText>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle} testID="text-top-searches-title">
                Top Searches
              </ThemedText>
              <View style={styles.topSearchGrid}>
                {TOP_SEARCHES.map(renderTopSearchItem)}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle} testID="text-trending-title">
                Trending
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trendingScroll}
              >
                {TRENDING.map(renderTrendingItem)}
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  searchBarContent: {
    padding: Spacing.sm,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === "ios" ? Spacing.sm : Spacing.xs,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  topSearchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  topSearchItem: {
    width: "22%",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  topSearchImageContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  topSearchImage: {
    width: 60,
    height: 60,
  },
  topSearchLabel: {
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  trendingScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  trendingItem: {
    width: 140,
  },
  trendingCardContent: {
    padding: Spacing.md,
    alignItems: "center",
  },
  trendingImageContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  trendingImage: {
    width: 80,
    height: 80,
  },
  trendingLabel: {
    textAlign: "center",
  },
  searchResults: {
    marginTop: Spacing.xl,
  },
  searchResultsList: {
    gap: Spacing.sm,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  searchResultLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  searchResultImage: {
    width: 48,
    height: 48,
  },
  searchResultInfo: {
    flex: 1,
  },
  addButton: {
    paddingHorizontal: Spacing.lg,
    minHeight: 40,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.sm,
  },
  noResultsText: {
    marginTop: Spacing.sm,
  },
  addedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${AppColors.success}D9`,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.xl,
  },
  addedCheckContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
