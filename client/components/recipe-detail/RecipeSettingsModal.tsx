import React, { useState, useEffect } from "react";
import { View, Modal, Pressable, StyleSheet, ScrollView, BackHandler } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";

import { logger } from "@/lib/logger";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, UserPreferences, DEFAULT_MACRO_TARGETS } from "@/lib/storage";
import type { RecipeSettings } from "@/navigation/RecipesStackNavigator";

interface RecipeSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate?: (settings: RecipeSettings) => void;
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
] as const;

const COOKING_LEVELS = [
  { key: "basic", label: "Basic" },
  { key: "intermediate", label: "Intermediate" },
  { key: "professional", label: "Professional" },
] as const;

const CREATIVITY_LEVELS = [
  { key: "basic", label: "Basic" },
  { key: "special", label: "Special" },
  { key: "spicy", label: "Spicy" },
  { key: "wild", label: "Wild" },
] as const;

const SERVING_OPTIONS = [1, 2, 4, 6, 8, 12];
const TIME_OPTIONS = [15, 30, 45, 60, 90, 120];
const INGREDIENT_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const CUISINE_OPTIONS = [
  { id: "american", label: "American" },
  { id: "italian", label: "Italian" },
  { id: "mexican", label: "Mexican" },
  { id: "asian", label: "Asian" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "indian", label: "Indian" },
  { id: "french", label: "French" },
  { id: "japanese", label: "Japanese" },
  { id: "chinese", label: "Chinese" },
  { id: "thai", label: "Thai" },
  { id: "korean", label: "Korean" },
  { id: "greek", label: "Greek" },
];

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "gluten-free", label: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free" },
  { id: "keto", label: "Keto" },
  { id: "paleo", label: "Paleo" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
];

export function RecipeSettingsModal({
  visible,
  onClose,
  onGenerate,
}: RecipeSettingsModalProps) {
  const { theme, style: themeStyle } = useTheme();
  const { containerRef, onAccessibilityEscape } = useFocusTrap({
    visible,
    onDismiss: onClose,
  });
  const [saving, setSaving] = useState(false);

  const [servings, setServings] = useState(4);
  const [maxTime, setMaxTime] = useState(60);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<Set<string>>(
    new Set(),
  );
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [selectedCuisineForRecipe, setSelectedCuisineForRecipe] = useState<
    string | undefined
  >(undefined);
  const [mealType, setMealType] = useState<string | undefined>(undefined);
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(false);
  const [cookingLevel, setCookingLevel] = useState<string>("intermediate");
  const [creativity, setCreativity] = useState<string>("special");
  const [ingredientCountMin, setIngredientCountMin] = useState(4);
  const [ingredientCountMax, setIngredientCountMax] = useState(6);

  const toggleDietary = (id: string) => {
    setDietaryRestrictions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (visible) {
      loadPreferences();
    }
  }, [visible]);

  const loadPreferences = async () => {
    const prefs = await storage.getPreferences();
    if (prefs) {
      setServings(prefs.servingSize || 4);
      setMaxTime(prefs.maxCookingTime || 60);
      setDietaryRestrictions(new Set(prefs.dietaryRestrictions || []));
      setCuisines(new Set(prefs.cuisinePreferences || []));
      setMealType(prefs.mealType);
      setPrioritizeExpiring(prefs.prioritizeExpiring || false);
      setCookingLevel(prefs.cookingLevel || "intermediate");
      setCreativity(prefs.llmCreativity || "special");
      setIngredientCountMin(prefs.ingredientCountMin || 4);
      setIngredientCountMax(prefs.ingredientCountMax || 6);
    }
  };

  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );

    return () => backHandler.remove();
  }, [visible, onClose]);

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const currentPrefs = await storage.getPreferences();
      const updatedPrefs: UserPreferences = {
        ...currentPrefs,
        dietaryRestrictions: Array.from(dietaryRestrictions),
        cuisinePreferences: currentPrefs?.cuisinePreferences || [],
        notificationsEnabled: currentPrefs?.notificationsEnabled ?? true,
        expirationAlertDays: currentPrefs?.expirationAlertDays ?? 3,
        servingSize: servings,
        maxCookingTime: maxTime,
        mealType: mealType as UserPreferences["mealType"],
        prioritizeExpiring,
        cookingLevel: cookingLevel as UserPreferences["cookingLevel"],
        llmCreativity: creativity as UserPreferences["llmCreativity"],
        macroTargets: currentPrefs?.macroTargets ?? DEFAULT_MACRO_TARGETS,
        ingredientCountMin,
        ingredientCountMax,
      };
      await storage.setPreferences(updatedPrefs);
      onClose();
      if (onGenerate) {
        const settings: RecipeSettings = {
          servings,
          maxTime,
          mealType: mealType as RecipeSettings["mealType"],
          ingredientCount: { min: ingredientCountMin, max: ingredientCountMax },
          cuisine: selectedCuisineForRecipe,
        };
        onGenerate(settings);
      }
    } catch (error) {
      logger.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const OptionChip = ({
    selected,
    onPress,
    label,
  }: {
    selected: boolean;
    onPress: () => void;
    label: string;
  }) => (
    <Pressable
      style={[
        styles.optionChip,
        {
          backgroundColor: selected
            ? AppColors.primary
            : themeStyle.glass.background,
          borderColor: selected ? AppColors.primary : themeStyle.glass.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <ThemedText
        type="small"
        style={{ color: selected ? theme.buttonText : theme.text }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <BlurView
        intensity={20}
        tint={themeStyle.blur.tintDefault}
        style={styles.overlay}
      >
        <View
          ref={containerRef}
          onAccessibilityEscape={onAccessibilityEscape}
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: themeStyle.glass.borderSubtle }]}>
            <ThemedText type="h3">Recipe Settings</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close recipe settings">
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            accessibilityLabel="Recipe settings options"
          >
            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>
                Servings
              </ThemedText>
              <View style={styles.optionsRow}>
                {SERVING_OPTIONS.map((num) => (
                  <OptionChip
                    key={num}
                    selected={servings === num}
                    onPress={() => setServings(num)}
                    label={String(num)}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>
                Max Cooking Time (minutes)
              </ThemedText>
              <View style={styles.optionsRow}>
                {TIME_OPTIONS.map((mins) => (
                  <OptionChip
                    key={mins}
                    selected={maxTime === mins}
                    onPress={() => setMaxTime(mins)}
                    label={String(mins)}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>
                Number of Ingredients
              </ThemedText>
              <View style={styles.ingredientCountRow}>
                <View style={styles.ingredientCountSection}>
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.textSecondary,
                      marginBottom: Spacing.xs,
                    }}
                  >
                    Min
                  </ThemedText>
                  <View style={styles.optionsRow}>
                    {INGREDIENT_COUNT_OPTIONS.filter(
                      (n) => n <= ingredientCountMax,
                    ).map((num) => (
                      <OptionChip
                        key={`min-${num}`}
                        selected={ingredientCountMin === num}
                        onPress={() => setIngredientCountMin(num)}
                        label={String(num)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.ingredientCountSection}>
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.textSecondary,
                      marginBottom: Spacing.xs,
                    }}
                  >
                    Max
                  </ThemedText>
                  <View style={styles.optionsRow}>
                    {INGREDIENT_COUNT_OPTIONS.filter(
                      (n) => n >= ingredientCountMin,
                    ).map((num) => (
                      <OptionChip
                        key={`max-${num}`}
                        selected={ingredientCountMax === num}
                        onPress={() => setIngredientCountMax(num)}
                        label={String(num)}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
              >
                Recipe will use {ingredientCountMin}-{ingredientCountMax}{" "}
                ingredients
              </ThemedText>
            </GlassCard>

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>
                Meal Type
              </ThemedText>
              <View style={styles.optionsRow}>
                {MEAL_TYPES.map((type) => (
                  <OptionChip
                    key={type.key}
                    selected={mealType === type.key}
                    onPress={() =>
                      setMealType(mealType === type.key ? undefined : type.key)
                    }
                    label={type.label}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>
                Cooking Level
              </ThemedText>
              <View style={styles.optionsRow}>
                {COOKING_LEVELS.map((level) => (
                  <OptionChip
                    key={level.key}
                    selected={cookingLevel === level.key}
                    onPress={() => setCookingLevel(level.key)}
                    label={level.label}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>
                AI Creativity
              </ThemedText>
              <View style={styles.optionsRow}>
                {CREATIVITY_LEVELS.map((level) => (
                  <OptionChip
                    key={level.key}
                    selected={creativity === level.key}
                    onPress={() => setCreativity(level.key)}
                    label={level.label}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>
                Dietary Restrictions
              </ThemedText>
              <View style={styles.optionsRow}>
                {DIETARY_OPTIONS.map((option) => (
                  <OptionChip
                    key={option.id}
                    selected={dietaryRestrictions.has(option.id)}
                    onPress={() => toggleDietary(option.id)}
                    label={option.label}
                  />
                ))}
              </View>
            </GlassCard>

            {cuisines.size > 0 && (
              <GlassCard style={styles.section}>
                <ThemedText type="caption" style={styles.sectionTitle}>
                  Cuisine
                </ThemedText>
                <View style={styles.optionsRow}>
                  {CUISINE_OPTIONS.filter((option) =>
                    cuisines.has(option.id),
                  ).map((option) => (
                    <OptionChip
                      key={option.id}
                      selected={selectedCuisineForRecipe === option.id}
                      onPress={() =>
                        setSelectedCuisineForRecipe(
                          selectedCuisineForRecipe === option.id
                            ? undefined
                            : option.id,
                        )
                      }
                      label={option.label}
                    />
                  ))}
                </View>
              </GlassCard>
            )}

            <GlassCard style={styles.section}>
              <Pressable
                style={styles.toggleRow}
                onPress={() => setPrioritizeExpiring(!prioritizeExpiring)}
                accessibilityRole="switch"
                accessibilityState={{ checked: prioritizeExpiring }}
                accessibilityLabel="Prioritize expiring items"
              >
                <View style={styles.toggleInfo}>
                  <ThemedText type="small">
                    Prioritize Expiring Items
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    Use ingredients that expire soon first
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: prioritizeExpiring
                        ? AppColors.primary
                        : themeStyle.glass.background,
                      borderColor: prioritizeExpiring
                        ? AppColors.primary
                        : themeStyle.glass.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      {
                        backgroundColor: prioritizeExpiring
                          ? theme.buttonText
                          : theme.textSecondary,
                        transform: [
                          { translateX: prioritizeExpiring ? 16 : 0 },
                        ],
                      },
                    ]}
                  />
                </View>
              </Pressable>
            </GlassCard>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.generateButton, { opacity: saving ? 0.7 : 1 }]}
              onPress={handleGenerate}
              disabled={saving}
              testID="button-generate-recipe"
              accessibilityRole="button"
              accessibilityLabel={saving ? "Saving settings" : "Generate recipe"}
              accessibilityState={{ disabled: saving }}
            >
              <Feather name="zap" size={20} color={theme.buttonText} />
              <ThemedText type="button" style={[styles.generateButtonText, { color: theme.buttonText }]}>
                {saving ? "Saving..." : "Generate Recipe"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
    minHeight: "60%",
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  ingredientCountRow: {
    gap: Spacing.md,
  },
  ingredientCountSection: {
    marginBottom: Spacing.xs,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  toggleSwitch: {
    width: 44,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    padding: 2,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  footer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  generateButtonText: {
    fontWeight: "600",
  },
});
