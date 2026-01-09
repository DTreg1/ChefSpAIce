import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  AppColors,
  GlassEffect,
} from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type FoodSource = "usda" | "openfoodfacts" | "local";

interface FoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
}

export interface UnifiedFoodItem {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  brand?: string;
  imageUrl?: string;
  nutrition: FoodNutrition;
  source: FoodSource;
  sourceId: string;
  relevanceScore: number;
  dataCompleteness: number;
}

export interface USDAFoodItem {
  fdcId: number;
  description: string;
  brandOwner: string | null;
  dataType: string;
  servingSize: number;
  servingSizeUnit: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  category: string;
}

const SOURCE_BADGE_COLORS: Record<FoodSource, { bg: string; text: string }> = {
  usda: { bg: "rgba(52, 152, 219, 0.15)", text: "#3498DB" },
  openfoodfacts: { bg: "rgba(39, 174, 96, 0.15)", text: "#27AE60" },
  local: { bg: "rgba(108, 117, 125, 0.15)", text: "#6C757D" },
};

const SOURCE_LABELS: Record<FoodSource, string> = {
  usda: "USDA",
  openfoodfacts: "Open Food Facts",
  local: "Local",
};

function convertToUSDAFormat(item: UnifiedFoodItem): USDAFoodItem {
  return {
    fdcId: Number(item.sourceId) || 0,
    description: item.name,
    brandOwner: item.brand || null,
    dataType: item.source === "usda" ? "Foundation" : "Branded",
    servingSize: item.nutrition.servingSize
      ? parseInt(item.nutrition.servingSize)
      : 100,
    servingSizeUnit: "g",
    nutrition: {
      calories: item.nutrition.calories || 0,
      protein: item.nutrition.protein || 0,
      carbs: item.nutrition.carbs || 0,
      fat: item.nutrition.fat || 0,
      fiber: item.nutrition.fiber || 0,
      sugar: item.nutrition.sugar || 0,
    },
    category: item.category || "Other",
  };
}

export default function FoodSearchScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const menuItems: MenuItemConfig[] = [];

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UnifiedFoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const url = new URL("/api/food/search", getApiUrl());
      url.searchParams.set("query", searchQuery.trim());

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to search foods");
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError("Unable to search foods. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleSelectFood = (food: UnifiedFoodItem) => {
    navigation.navigate("AddItem", {
      usdaFood: convertToUSDAFormat(food),
    });
  };

  const renderFoodItem = ({ item }: { item: UnifiedFoodItem }) => {
    const sourceColors = SOURCE_BADGE_COLORS[item.source];
    const sourceLabel = SOURCE_LABELS[item.source];
    const servingDisplay = item.nutrition.servingSize || null;

    return (
      <Pressable onPress={() => handleSelectFood(item)}>
        <GlassCard style={styles.foodCard}>
          <View style={styles.foodHeader}>
            <View style={styles.foodInfo}>
              <View style={styles.nameRow}>
                <ThemedText
                  type="body"
                  style={styles.foodName}
                  numberOfLines={2}
                >
                  {item.name}
                </ThemedText>
                <View
                  style={[
                    styles.sourceBadge,
                    { backgroundColor: sourceColors.bg },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.sourceBadgeText,
                      { color: sourceColors.text },
                    ]}
                  >
                    {sourceLabel}
                  </ThemedText>
                </View>
              </View>
              {item.brand ? (
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {item.brand}
                </ThemedText>
              ) : null}
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </View>

          <View style={styles.nutritionRow}>
            <View style={styles.nutritionBadge}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {item.nutrition.calories}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                cal
              </ThemedText>
            </View>
            <View style={styles.nutritionBadge}>
              <ThemedText
                type="small"
                style={{ fontWeight: "600", color: AppColors.primary }}
              >
                {item.nutrition.protein}g
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                protein
              </ThemedText>
            </View>
            <View style={styles.nutritionBadge}>
              <ThemedText
                type="small"
                style={{ fontWeight: "600", color: AppColors.secondary }}
              >
                {item.nutrition.carbs}g
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                carbs
              </ThemedText>
            </View>
            <View style={styles.nutritionBadge}>
              <ThemedText
                type="small"
                style={{ fontWeight: "600", color: AppColors.warning }}
              >
                {item.nutrition.fat}g
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                fat
              </ThemedText>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: theme.glass.backgroundSubtle },
              ]}
            >
              <ThemedText type="caption">{item.category}</ThemedText>
            </View>
            {servingDisplay ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {servingDisplay}
              </ThemedText>
            ) : null}
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={48} color={AppColors.error} />
          <ThemedText type="body" style={styles.emptyText}>
            {error}
          </ThemedText>
        </View>
      );
    }

    if (searched && results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.emptyText}>
            No foods found for "{searchQuery}"
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center" }}
          >
            Try a different search term or check spelling
          </ThemedText>
        </View>
      );
    }

    if (!searched) {
      return (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.emptyText}>
            Search Food Databases
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center" }}
          >
            Find nutrition info from USDA and Open Food Facts
          </ThemedText>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Food Search"
        screenKey="foodSearch"
        showSearch={false}
        menuItems={menuItems}
      />
      <View
        style={[
          styles.searchContainer,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
          },
        ]}
      >
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.glass.backgroundSubtle,
              borderColor: theme.glass.border,
            },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search foods (e.g., apple, chicken breast)"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={[
            styles.searchButton,
            {
              backgroundColor: AppColors.primary + "E6",
              opacity: searchQuery.trim() ? 1 : 0.5,
            },
          ]}
          onPress={handleSearch}
          disabled={!searchQuery.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="search" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderFoodItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: GlassEffect.borderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: GlassEffect.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  foodCard: {
    gap: Spacing.sm,
  },
  foodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  foodInfo: {
    flex: 1,
    gap: 2,
  },
  foodName: {
    fontWeight: "500",
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  nutritionRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  nutritionBadge: {
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: GlassEffect.borderRadius.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
