import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, AppColors } from "@/constants/theme";

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

export interface FoodSearchResult {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  usdaCategory?: string;
  brand?: string;
  imageUrl?: string;
  nutrition: FoodNutrition;
  source: FoodSource;
  sourceId: string;
  relevanceScore: number;
  dataCompleteness: number;
}

interface FoodSearchAutocompleteProps {
  onSelect: (item: FoodSearchResult) => void;
  placeholder?: string;
  initialValue?: string;
}

const SOURCE_BADGE_COLORS: Record<FoodSource, { bg: string; text: string }> = {
  usda: { bg: "rgba(52, 152, 219, 0.15)", text: "#3498DB" },
  openfoodfacts: { bg: "rgba(39, 174, 96, 0.15)", text: "#27AE60" },
  local: { bg: "rgba(108, 117, 125, 0.15)", text: "#6C757D" },
};

const SOURCE_LABELS: Record<FoodSource, string> = {
  usda: "USDA",
  openfoodfacts: "OFF",
  local: "Local",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function HighlightedText({
  text,
  highlight,
  style,
}: {
  text: string;
  highlight: string;
  style?: any;
}) {
  const { theme } = useTheme();

  if (!highlight.trim()) {
    return <ThemedText style={style}>{text}</ThemedText>;
  }

  const regex = new RegExp(
    `(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);

  return (
    <ThemedText style={style}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <ThemedText
            key={index}
            style={[style, { fontWeight: "700", color: theme.primary }]}
          >
            {part}
          </ThemedText>
        ) : (
          part
        ),
      )}
    </ThemedText>
  );
}

function SourceBadge({ source }: { source: FoodSource }) {
  const colors = SOURCE_BADGE_COLORS[source];
  const label = SOURCE_LABELS[source];

  return (
    <View style={[styles.sourceBadge, { backgroundColor: colors.bg }]}>
      <ThemedText style={[styles.sourceBadgeText, { color: colors.text }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function SkeletonItem() {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withTiming(opacity.value === 0.3 ? 0.7 : 0.3, {
        duration: 800,
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.resultItem, animatedStyle]}>
      <View style={styles.resultContent}>
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: theme.backgroundTertiary, width: "70%" },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.backgroundTertiary,
              width: "40%",
              height: 12,
              marginTop: 6,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.skeletonBadge,
          { backgroundColor: theme.backgroundTertiary },
        ]}
      />
    </Animated.View>
  );
}

function ResultItem({
  item,
  query,
  onSelect,
  isSelected,
}: {
  item: FoodSearchResult;
  query: string;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const { theme } = useTheme();
  const searchParts = query.split(":");
  const productQuery =
    searchParts.length > 1 ? searchParts[searchParts.length - 1] : query;

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.resultItem,
        {
          backgroundColor: isSelected
            ? theme.backgroundSecondary
            : pressed
              ? theme.backgroundSecondary
              : "transparent",
        },
      ]}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <HighlightedText
            text={item.name}
            highlight={productQuery}
            style={styles.resultName}
          />
          <SourceBadge source={item.source} />
        </View>
        {item.brand ? (
          <View style={styles.brandRow}>
            <Feather
              name="tag"
              size={12}
              color={theme.textSecondary}
              style={{ opacity: 0.7 }}
            />
            <ThemedText type="caption" style={styles.resultBrandName}>
              {item.brand}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.resultMeta}>
          {item.category ? (
            <ThemedText type="caption" style={styles.resultCategory}>
              {item.category}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.resultNutritionRow}>
          <ThemedText type="caption" style={styles.resultCalories}>
            {item.nutrition.calories} cal
          </ThemedText>
          <ThemedText type="caption" style={styles.resultNutrient}>
            P: {item.nutrition.protein}g
          </ThemedText>
          <ThemedText type="caption" style={styles.resultNutrient}>
            C: {item.nutrition.carbs}g
          </ThemedText>
          <ThemedText type="caption" style={styles.resultNutrient}>
            F: {item.nutrition.fat}g
          </ThemedText>
          {item.nutrition.servingSize ? (
            <ThemedText type="caption" style={styles.resultServing}>
              ({item.nutrition.servingSize})
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function FoodSearchAutocomplete({
  onSelect,
  placeholder = "Search foods...",
  initialValue = "",
}: FoodSearchAutocompleteProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 300);

  const dropdownOpacity = useSharedValue(0);

  const { data, isLoading, isFetching } = useQuery<any>({
    queryKey: [
      "/api/food/search",
      `?query=${encodeURIComponent(debouncedQuery)}`,
    ],
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000,
  });

  const rawFoods = data?.foods || data?.results || [];
  const results: FoodSearchResult[] = rawFoods.map((food: any) => ({
    id: `usda-${food.fdcId}`,
    name: food.description,
    normalizedName: food.description?.toLowerCase() || "",
    category: food.category || "Other",
    brand: food.brandOwner || undefined,
    nutrition: {
      calories: food.nutrition?.calories || 0,
      protein: food.nutrition?.protein || 0,
      carbs: food.nutrition?.carbs || 0,
      fat: food.nutrition?.fat || 0,
      fiber: food.nutrition?.fiber,
      sugar: food.nutrition?.sugar,
      servingSize: food.servingSize
        ? `${food.servingSize}${food.servingSizeUnit || "g"}`
        : undefined,
    },
    source: "usda" as FoodSource,
    sourceId: String(food.fdcId),
    relevanceScore: 100,
    dataCompleteness: 100,
  }));

  useEffect(() => {
    if (isOpen && results.length > 0) {
      dropdownOpacity.value = withTiming(1, { duration: 200 });
    } else {
      dropdownOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isOpen, results.length]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (item: FoodSearchResult) => {
      setQuery(item.name);
      setIsOpen(false);
      setSelectedIndex(-1);
      Keyboard.dismiss();
      onSelect(item);
    },
    [onSelect],
  );

  const handleAddCustom = useCallback(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const customItem: FoodSearchResult = {
      id: `custom-${Date.now()}`,
      name: trimmedQuery,
      normalizedName: trimmedQuery.toLowerCase(),
      category: "Other",
      nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
      source: "local" as FoodSource,
      sourceId: `custom-${Date.now()}`,
      relevanceScore: 100,
      dataCompleteness: 0,
    };

    setQuery(trimmedQuery);
    setIsOpen(false);
    setSelectedIndex(-1);
    Keyboard.dismiss();
    onSelect(customItem);
  }, [query, onSelect]);

  const handleClear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleFocus = useCallback(() => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  }, [query]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (text.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, []);

  const handleKeyPress = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;

      const key = e.nativeEvent?.key;
      const totalItems = results.length + (query.trim().length > 0 ? 1 : 0);

      switch (key) {
        case "ArrowDown":
          e.preventDefault?.();
          setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault?.();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault?.();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleSelect(results[selectedIndex]);
          } else if (
            selectedIndex === results.length &&
            query.trim().length > 0
          ) {
            handleAddCustom();
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [results, selectedIndex, query, handleSelect, handleAddCustom],
  );

  const dropdownStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
    transform: [{ translateY: dropdownOpacity.value === 0 ? -10 : 0 }],
  }));

  const showDropdown = isOpen && (query.length >= 2 || results.length > 0);
  const showLoading = isLoading || isFetching;
  const showEmpty =
    !showLoading && debouncedQuery.length >= 2 && results.length === 0;
  const showPrompt = query.length > 0 && query.length < 2;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isOpen ? theme.primary : theme.border,
          },
        ]}
      >
        <Feather
          name="search"
          size={20}
          color={theme.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {showLoading ? (
          <ActivityIndicator
            size="small"
            color={theme.primary}
            style={styles.clearButton}
          />
        ) : query.length > 0 ? (
          <Pressable
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={8}
          >
            <Feather name="x-circle" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {showDropdown ? (
        <Animated.View
          style={[
            styles.dropdown,
            dropdownStyle,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              ...Shadows.lg,
            },
          ]}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {showLoading ? (
              <>
                <SkeletonItem />
                <SkeletonItem />
                <SkeletonItem />
              </>
            ) : showEmpty ? (
              <View style={styles.emptyState}>
                <Feather name="search" size={32} color={theme.textSecondary} />
                <ThemedText type="small" style={styles.emptyText}>
                  No results found
                </ThemedText>
              </View>
            ) : showPrompt ? (
              <View style={styles.emptyState}>
                <ThemedText type="small" style={styles.emptyText}>
                  Type to search...
                </ThemedText>
              </View>
            ) : (
              results.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeIn.delay(index * 30).duration(200)}
                >
                  <ResultItem
                    item={item}
                    query={debouncedQuery}
                    onSelect={() => handleSelect(item)}
                    isSelected={selectedIndex === index}
                  />
                </Animated.View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: Spacing.inputHeight,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  clearButton: {
    padding: Spacing.xs,
  },
  dropdown: {
    position: "absolute",
    top: Spacing.inputHeight + Spacing.xs,
    left: 0,
    right: 0,
    maxHeight: 300,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  scrollView: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: Spacing.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  resultBrandName: {
    fontWeight: "600",
    opacity: 0.85,
  },
  resultCategory: {
    opacity: 0.6,
    fontStyle: "italic",
  },
  resultNutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  resultCalories: {
    color: AppColors.primary,
    fontWeight: "500",
  },
  resultNutrient: {
    opacity: 0.7,
  },
  resultServing: {
    opacity: 0.5,
    fontSize: 10,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: "center",
  },
  skeletonLine: {
    height: 16,
    borderRadius: BorderRadius.xs,
  },
  skeletonBadge: {
    width: 40,
    height: 18,
    borderRadius: BorderRadius.xs,
  },
});
