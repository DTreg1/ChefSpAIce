import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, UserPreferences, DEFAULT_MACRO_TARGETS } from "@/lib/storage";

interface RecipeSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate?: () => void;
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

export function RecipeSettingsModal({ visible, onClose, onGenerate }: RecipeSettingsModalProps) {
  const { theme, isDark } = useTheme();
  const [saving, setSaving] = useState(false);

  const [servings, setServings] = useState(4);
  const [maxTime, setMaxTime] = useState(60);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<Set<string>>(new Set());
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [mealType, setMealType] = useState<string | undefined>(undefined);
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(false);
  const [cookingLevel, setCookingLevel] = useState<string>("intermediate");
  const [creativity, setCreativity] = useState<string>("special");

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

  const toggleCuisine = (id: string) => {
    setCuisines((prev) => {
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
    }
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const currentPrefs = await storage.getPreferences();
      const updatedPrefs: UserPreferences = {
        ...currentPrefs,
        dietaryRestrictions: Array.from(dietaryRestrictions),
        cuisinePreferences: Array.from(cuisines),
        notificationsEnabled: currentPrefs?.notificationsEnabled ?? true,
        expirationAlertDays: currentPrefs?.expirationAlertDays ?? 3,
        servingSize: servings,
        maxCookingTime: maxTime,
        mealType: mealType as UserPreferences['mealType'],
        prioritizeExpiring,
        cookingLevel: cookingLevel as UserPreferences['cookingLevel'],
        llmCreativity: creativity as UserPreferences['llmCreativity'],
        macroTargets: currentPrefs?.macroTargets ?? DEFAULT_MACRO_TARGETS,
      };
      await storage.setPreferences(updatedPrefs);
      onClose();
      if (onGenerate) {
        onGenerate();
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const OptionChip = ({ 
    selected, 
    onPress, 
    label 
  }: { 
    selected: boolean; 
    onPress: () => void; 
    label: string;
  }) => (
    <Pressable
      style={[
        styles.optionChip,
        {
          backgroundColor: selected ? AppColors.primary : theme.glass.background,
          borderColor: selected ? AppColors.primary : theme.glass.border,
        },
      ]}
      onPress={onPress}
    >
      <ThemedText
        type="small"
        style={{ color: selected ? "#FFFFFF" : theme.text }}
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
    >
      <BlurView
        intensity={20}
        tint={isDark ? "dark" : "light"}
        style={styles.overlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.header}>
            <ThemedText type="h3">Recipe Settings</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>Servings</ThemedText>
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
              <ThemedText type="caption" style={styles.sectionTitle}>Max Cooking Time (minutes)</ThemedText>
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
              <ThemedText type="caption" style={styles.sectionTitle}>Meal Type</ThemedText>
              <View style={styles.optionsRow}>
                {MEAL_TYPES.map((type) => (
                  <OptionChip
                    key={type.key}
                    selected={mealType === type.key}
                    onPress={() => setMealType(mealType === type.key ? undefined : type.key)}
                    label={type.label}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>Cooking Level</ThemedText>
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
              <ThemedText type="caption" style={styles.sectionTitle}>AI Creativity</ThemedText>
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
              <ThemedText type="caption" style={styles.sectionTitle}>Dietary Restrictions</ThemedText>
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

            <GlassCard style={styles.section}>
              <ThemedText type="caption" style={styles.sectionTitle}>Cuisine Preferences</ThemedText>
              <View style={styles.optionsRow}>
                {CUISINE_OPTIONS.map((option) => (
                  <OptionChip
                    key={option.id}
                    selected={cuisines.has(option.id)}
                    onPress={() => toggleCuisine(option.id)}
                    label={option.label}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.section}>
              <Pressable
                style={styles.toggleRow}
                onPress={() => setPrioritizeExpiring(!prioritizeExpiring)}
              >
                <View style={styles.toggleInfo}>
                  <ThemedText type="small">Prioritize Expiring Items</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Use ingredients that expire soon first
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: prioritizeExpiring
                        ? AppColors.primary
                        : theme.glass.background,
                      borderColor: prioritizeExpiring
                        ? AppColors.primary
                        : theme.glass.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      {
                        backgroundColor: prioritizeExpiring ? "#FFFFFF" : theme.textSecondary,
                        transform: [{ translateX: prioritizeExpiring ? 16 : 0 }],
                      },
                    ]}
                  />
                </View>
              </Pressable>
            </GlassCard>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.generateButton,
                { opacity: saving ? 0.7 : 1 },
              ]}
              onPress={handleGenerate}
              disabled={saving}
              testID="button-generate-recipe"
            >
              <Feather name="zap" size={20} color="#FFFFFF" />
              <ThemedText type="button" style={styles.generateButtonText}>
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
    borderBottomColor: "rgba(0,0,0,0.1)",
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
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
