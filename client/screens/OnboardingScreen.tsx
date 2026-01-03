import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, CommonActions, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, FoodItem, generateId, NutritionInfo } from "@/lib/storage";
import { STARTER_FOOD_IMAGES } from "@/lib/food-images";
import { getApiUrl } from "@/lib/query-client";
import { useOnboardingStatus } from "@/contexts/OnboardingContext";

const BASIC_COOKWARE_LIMIT = 5;

interface Appliance {
  id: number;
  name: string;
  category: string;
  description: string;
  icon: string;
  isCommon: boolean;
  alternatives: string[];
}

interface StarterFood {
  id: string;
  name: string;
  category: string;
  recommendedStorage: "fridge" | "freezer" | "pantry" | "counter";
  defaultQuantity: number;
  unit: string;
  shelfLifeDays: number;
  icon: keyof typeof Feather.glyphMap;
  fdcId: number;
  nutrition?: NutritionInfo;
}

const STARTER_FOODS: StarterFood[] = [
  {
    id: "milk",
    name: "Milk, whole",
    category: "Dairy and Egg Products",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "gallon",
    shelfLifeDays: 7,
    icon: "droplet",
    fdcId: 746776,
    nutrition: {
      calories: 61,
      protein: 3.15,
      carbs: 4.78,
      fat: 3.27,
      fiber: 0,
      sugar: 5.05,
      sodium: 43,
      servingSize: "100g",
    },
  },
  {
    id: "eggs",
    name: "Egg, whole, raw",
    category: "Dairy and Egg Products",
    recommendedStorage: "fridge",
    defaultQuantity: 12,
    unit: "count",
    shelfLifeDays: 21,
    icon: "circle",
    fdcId: 748967,
    nutrition: {
      calories: 143,
      protein: 12.56,
      carbs: 0.72,
      fat: 9.51,
      fiber: 0,
      sugar: 0.37,
      sodium: 142,
      servingSize: "100g",
    },
  },
  {
    id: "butter",
    name: "Butter, salted",
    category: "Fats and Oils",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "stick",
    shelfLifeDays: 30,
    icon: "square",
    fdcId: 173410,
    nutrition: {
      calories: 717,
      protein: 0.85,
      carbs: 0.06,
      fat: 81.11,
      fiber: 0,
      sugar: 0.06,
      sodium: 643,
      servingSize: "100g",
    },
  },
  {
    id: "cheese",
    name: "Cheese, cheddar",
    category: "Dairy and Egg Products",
    recommendedStorage: "fridge",
    defaultQuantity: 8,
    unit: "oz",
    shelfLifeDays: 21,
    icon: "grid",
    fdcId: 173414,
    nutrition: {
      calories: 403,
      protein: 22.87,
      carbs: 3.09,
      fat: 33.31,
      fiber: 0,
      sugar: 0.48,
      sodium: 653,
      servingSize: "100g",
    },
  },
  {
    id: "yogurt",
    name: "Yogurt, plain, whole milk",
    category: "Dairy and Egg Products",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "container",
    shelfLifeDays: 14,
    icon: "circle",
    fdcId: 171284,
    nutrition: {
      calories: 61,
      protein: 3.47,
      carbs: 4.66,
      fat: 3.25,
      fiber: 0,
      sugar: 4.66,
      sodium: 46,
      servingSize: "100g",
    },
  },
  {
    id: "bread",
    name: "Bread, white, commercially prepared",
    category: "Baked Products",
    recommendedStorage: "counter",
    defaultQuantity: 1,
    unit: "loaf",
    shelfLifeDays: 5,
    icon: "box",
    fdcId: 172687,
    nutrition: {
      calories: 266,
      protein: 7.64,
      carbs: 50.61,
      fat: 3.29,
      fiber: 2.3,
      sugar: 5.34,
      sodium: 477,
      servingSize: "100g",
    },
  },
  {
    id: "rice",
    name: "Rice, white, long-grain, regular, raw",
    category: "Cereal Grains and Pasta",
    recommendedStorage: "pantry",
    defaultQuantity: 1,
    unit: "lb",
    shelfLifeDays: 365,
    icon: "layers",
    fdcId: 169756,
    nutrition: {
      calories: 365,
      protein: 7.13,
      carbs: 79.95,
      fat: 0.66,
      fiber: 1.3,
      sugar: 0.12,
      sodium: 5,
      servingSize: "100g",
    },
  },
  {
    id: "pasta",
    name: "Pasta, dry, enriched",
    category: "Cereal Grains and Pasta",
    recommendedStorage: "pantry",
    defaultQuantity: 1,
    unit: "lb",
    shelfLifeDays: 365,
    icon: "layers",
    fdcId: 168936,
    nutrition: {
      calories: 371,
      protein: 13.04,
      carbs: 74.67,
      fat: 1.51,
      fiber: 3.2,
      sugar: 2.67,
      sodium: 6,
      servingSize: "100g",
    },
  },
  {
    id: "chicken",
    name: "Chicken, broilers or fryers, breast, meat only, raw",
    category: "Poultry Products",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "lb",
    shelfLifeDays: 2,
    icon: "disc",
    fdcId: 171477,
    nutrition: {
      calories: 120,
      protein: 22.5,
      carbs: 0,
      fat: 2.62,
      fiber: 0,
      sugar: 0,
      sodium: 45,
      servingSize: "100g",
    },
  },
  {
    id: "ground_beef",
    name: "Beef, ground, 80% lean meat / 20% fat, raw",
    category: "Beef Products",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "lb",
    shelfLifeDays: 2,
    icon: "disc",
    fdcId: 174036,
    nutrition: {
      calories: 254,
      protein: 17.17,
      carbs: 0,
      fat: 20,
      fiber: 0,
      sugar: 0,
      sodium: 75,
      servingSize: "100g",
    },
  },
  {
    id: "apples",
    name: "Apples, raw, with skin",
    category: "Fruits and Fruit Juices",
    recommendedStorage: "fridge",
    defaultQuantity: 4,
    unit: "count",
    shelfLifeDays: 21,
    icon: "circle",
    fdcId: 171688,
    nutrition: {
      calories: 52,
      protein: 0.26,
      carbs: 13.81,
      fat: 0.17,
      fiber: 2.4,
      sugar: 10.39,
      sodium: 1,
      servingSize: "100g",
    },
  },
  {
    id: "bananas",
    name: "Bananas, raw",
    category: "Fruits and Fruit Juices",
    recommendedStorage: "counter",
    defaultQuantity: 1,
    unit: "bunch",
    shelfLifeDays: 5,
    icon: "moon",
    fdcId: 173944,
    nutrition: {
      calories: 89,
      protein: 1.09,
      carbs: 22.84,
      fat: 0.33,
      fiber: 2.6,
      sugar: 12.23,
      sodium: 1,
      servingSize: "100g",
    },
  },
  {
    id: "onions",
    name: "Onions, raw",
    category: "Vegetables and Vegetable Products",
    recommendedStorage: "pantry",
    defaultQuantity: 3,
    unit: "count",
    shelfLifeDays: 30,
    icon: "circle",
    fdcId: 170000,
    nutrition: {
      calories: 40,
      protein: 1.1,
      carbs: 9.34,
      fat: 0.1,
      fiber: 1.7,
      sugar: 4.24,
      sodium: 4,
      servingSize: "100g",
    },
  },
  {
    id: "potatoes",
    name: "Potatoes, flesh and skin, raw",
    category: "Vegetables and Vegetable Products",
    recommendedStorage: "pantry",
    defaultQuantity: 5,
    unit: "count",
    shelfLifeDays: 21,
    icon: "box",
    fdcId: 170026,
    nutrition: {
      calories: 77,
      protein: 2.05,
      carbs: 17.49,
      fat: 0.09,
      fiber: 2.1,
      sugar: 0.82,
      sodium: 6,
      servingSize: "100g",
    },
  },
  {
    id: "tomatoes",
    name: "Tomatoes, red, ripe, raw",
    category: "Vegetables and Vegetable Products",
    recommendedStorage: "counter",
    defaultQuantity: 3,
    unit: "count",
    shelfLifeDays: 5,
    icon: "circle",
    fdcId: 170457,
    nutrition: {
      calories: 18,
      protein: 0.88,
      carbs: 3.89,
      fat: 0.2,
      fiber: 1.2,
      sugar: 2.63,
      sodium: 5,
      servingSize: "100g",
    },
  },
  {
    id: "carrots",
    name: "Carrots, raw",
    category: "Vegetables and Vegetable Products",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "lb",
    shelfLifeDays: 21,
    icon: "zap",
    fdcId: 170393,
    nutrition: {
      calories: 41,
      protein: 0.93,
      carbs: 9.58,
      fat: 0.24,
      fiber: 2.8,
      sugar: 4.74,
      sodium: 69,
      servingSize: "100g",
    },
  },
  {
    id: "broccoli",
    name: "Broccoli, raw",
    category: "Vegetables and Vegetable Products",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "head",
    shelfLifeDays: 7,
    icon: "cloud",
    fdcId: 170379,
    nutrition: {
      calories: 34,
      protein: 2.82,
      carbs: 6.64,
      fat: 0.37,
      fiber: 2.6,
      sugar: 1.7,
      sodium: 33,
      servingSize: "100g",
    },
  },
  {
    id: "orange_juice",
    name: "Orange juice, raw",
    category: "Fruits and Fruit Juices",
    recommendedStorage: "fridge",
    defaultQuantity: 1,
    unit: "carton",
    shelfLifeDays: 7,
    icon: "sun",
    fdcId: 169098,
    nutrition: {
      calories: 45,
      protein: 0.7,
      carbs: 10.4,
      fat: 0.2,
      fiber: 0.2,
      sugar: 8.4,
      sodium: 1,
      servingSize: "100g",
    },
  },
];

const STORAGE_LABELS: Record<
  string,
  { label: string; color: string; icon: keyof typeof Feather.glyphMap }
> = {
  fridge: { label: "Fridge", color: "#3B82F6", icon: "box" },
  freezer: { label: "Freezer", color: "#8B5CF6", icon: "thermometer" },
  pantry: { label: "Pantry", color: "#F59E0B", icon: "archive" },
  counter: { label: "Counter", color: "#10B981", icon: "grid" },
};

const EQUIPMENT_CATEGORIES = [
  {
    id: "essential",
    label: "Essential",
    icon: "home",
    description: "Basic kitchen items everyone needs",
  },
  {
    id: "cooking",
    label: "Cooking",
    icon: "thermometer",
    description: "Pots, pans, and cooking surfaces",
  },
  {
    id: "bakeware",
    label: "Bakeware",
    icon: "square",
    description: "Baking sheets, pans, and molds",
  },
  {
    id: "small appliances",
    label: "Small Appliances",
    icon: "zap",
    description: "Electric kitchen helpers",
  },
  {
    id: "prep tools",
    label: "Prep Tools",
    icon: "tool",
    description: "Cutting, mixing, and measuring",
  },
  {
    id: "specialty",
    label: "Specialty",
    icon: "star",
    description: "Special equipment for specific dishes",
  },
] as const;

type CategoryId = (typeof EQUIPMENT_CATEGORIES)[number]["id"];

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  thermometer: "thermometer",
  box: "box",
  zap: "zap",
  circle: "circle",
  square: "square",
  droplet: "droplet",
  coffee: "coffee",
  tool: "tool",
  layers: "layers",
  grid: "grid",
  package: "package",
  disc: "disc",
  clipboard: "clipboard",
  target: "target",
  filter: "filter",
  scissors: "scissors",
  edit3: "edit-3",
  sliders: "sliders",
  aperture: "aperture",
  watch: "watch",
  activity: "activity",
  wind: "wind",
  home: "home",
  star: "star",
  default: "box",
};

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

type OnboardingStep =
  | "preferences"
  | "storage"
  | "foods"
  | "cookware"
  | "complete";

// Preference options
const SERVING_SIZE_OPTIONS = [
  { value: 1, label: "Just me" },
  { value: 2, label: "2 people" },
  { value: 3, label: "3 people" },
  { value: 4, label: "4 people" },
  { value: 5, label: "5 people" },
  { value: 6, label: "6+ people" },
];

const DAILY_MEALS_OPTIONS = [
  { value: 2, label: "2 meals" },
  { value: 3, label: "3 meals" },
  { value: 4, label: "4 meals" },
  { value: 5, label: "5+ meals" },
];

const CUISINE_OPTIONS = [
  { id: "american", label: "American", icon: "flag" as const },
  { id: "italian", label: "Italian", icon: "coffee" as const },
  { id: "mexican", label: "Mexican", icon: "sun" as const },
  { id: "asian", label: "Asian", icon: "sunrise" as const },
  { id: "mediterranean", label: "Mediterranean", icon: "droplet" as const },
  { id: "indian", label: "Indian", icon: "zap" as const },
  { id: "french", label: "French", icon: "feather" as const },
  { id: "japanese", label: "Japanese", icon: "circle" as const },
  { id: "chinese", label: "Chinese", icon: "star" as const },
  { id: "thai", label: "Thai", icon: "heart" as const },
  { id: "korean", label: "Korean", icon: "moon" as const },
  { id: "greek", label: "Greek", icon: "compass" as const },
];

const DIETARY_PREFERENCE_OPTIONS = [
  { id: "none", label: "No restrictions", icon: "check-circle" as const },
  { id: "vegetarian", label: "Vegetarian", icon: "feather" as const },
  { id: "vegan", label: "Vegan", icon: "sun" as const },
  { id: "pescatarian", label: "Pescatarian", icon: "anchor" as const },
  { id: "gluten-free", label: "Gluten-Free", icon: "slash" as const },
  { id: "dairy-free", label: "Dairy-Free", icon: "x-circle" as const },
  { id: "keto", label: "Keto", icon: "activity" as const },
  { id: "paleo", label: "Paleo", icon: "target" as const },
  { id: "halal", label: "Halal", icon: "moon" as const },
  { id: "kosher", label: "Kosher", icon: "star" as const },
];

const DEFAULT_STORAGE_AREAS = [
  { id: "fridge", label: "Refrigerator", icon: "thermometer" as const, description: "For perishable items" },
  { id: "freezer", label: "Freezer", icon: "cloud-snow" as const, description: "For frozen goods" },
  { id: "pantry", label: "Pantry", icon: "box" as const, description: "For dry goods & canned items" },
  { id: "counter", label: "Counter", icon: "home" as const, description: "For fruits & daily items" },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function EquipmentItem({
  appliance,
  isSelected,
  onToggle,
}: {
  appliance: Appliance;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  const iconName = ICON_MAP[appliance.icon] || ICON_MAP.default;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.equipmentItem,
          {
            backgroundColor: isSelected
              ? `${AppColors.primary}20`
              : theme.backgroundSecondary,
            borderColor: isSelected ? AppColors.primary : theme.border,
          },
        ]}
      >
        <View style={styles.itemContent}>
          <View
            style={[
              styles.itemIcon,
              {
                backgroundColor: isSelected
                  ? AppColors.primary
                  : theme.backgroundTertiary,
              },
            ]}
          >
            <Feather
              name={iconName}
              size={18}
              color={isSelected ? "#FFFFFF" : theme.textSecondary}
            />
          </View>
          <View style={styles.itemText}>
            <ThemedText style={styles.itemName} numberOfLines={1}>
              {appliance.name}
            </ThemedText>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? AppColors.primary : "transparent",
                borderColor: isSelected
                  ? AppColors.primary
                  : theme.textSecondary,
              },
            ]}
          >
            {isSelected ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function FoodItemRow({
  food,
  isSelected,
  onToggle,
}: {
  food: StarterFood;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const storageInfo = STORAGE_LABELS[food.recommendedStorage];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.foodItem,
          {
            backgroundColor: isSelected
              ? `${AppColors.primary}15`
              : theme.backgroundSecondary,
            borderColor: isSelected ? AppColors.primary : theme.border,
          },
        ]}
      >
        <View style={styles.foodItemContent}>
          <View
            style={[
              styles.foodIcon,
              {
                backgroundColor: isSelected
                  ? AppColors.primary
                  : theme.backgroundTertiary,
                overflow: "hidden",
              },
            ]}
          >
            {STARTER_FOOD_IMAGES[food.id] ? (
              <Image
                source={STARTER_FOOD_IMAGES[food.id]}
                style={styles.foodImage}
                resizeMode="cover"
              />
            ) : (
              <Feather
                name={food.icon}
                size={18}
                color={isSelected ? "#FFFFFF" : theme.textSecondary}
              />
            )}
          </View>
          <View style={styles.foodInfo}>
            <ThemedText style={styles.foodName}>{food.name}</ThemedText>
            <View style={styles.foodMeta}>
              <View
                style={[
                  styles.storageTag,
                  { backgroundColor: `${storageInfo.color}20` },
                ]}
              >
                <Feather
                  name={storageInfo.icon}
                  size={10}
                  color={storageInfo.color}
                />
                <ThemedText
                  style={[styles.storageTagText, { color: storageInfo.color }]}
                >
                  {storageInfo.label}
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.quantityText, { color: theme.textSecondary }]}
              >
                {food.defaultQuantity} {food.unit}
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? AppColors.primary : "transparent",
                borderColor: isSelected
                  ? AppColors.primary
                  : theme.textSecondary,
              },
            ]}
          >
            {isSelected ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Onboarding">>();
  const { markOnboardingComplete } = useOnboardingStatus();
  const { entitlements } = useSubscription();

  const isPro = entitlements.maxCookware === 'unlimited';
  const cookwareLimit = isPro ? Infinity : BASIC_COOKWARE_LIMIT;

  // Always start at "preferences" since authentication is now handled in AuthScreen
  const [step, setStep] = useState<OnboardingStep>("preferences");
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedFoodIds, setSelectedFoodIds] = useState<Set<string>>(
    new Set(STARTER_FOODS.map((f) => f.id)),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preference states
  const [servingSize, setServingSize] = useState(2);
  const [dailyMeals, setDailyMeals] = useState(3);
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(
    new Set(["american", "italian", "mexican"])
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<Set<string>>(
    new Set(["none"])
  );
  const [selectedStorageAreas, setSelectedStorageAreas] = useState<Set<string>>(
    new Set(["fridge", "freezer", "pantry", "counter"])
  );
  const [appliancesLoaded, setAppliancesLoaded] = useState(false);

  useEffect(() => {
    loadAppliances();
  }, []);

  // Enforce cookware limit when subscription changes or after initial load
  useEffect(() => {
    if (appliancesLoaded && !isPro && selectedEquipmentIds.size > BASIC_COOKWARE_LIMIT) {
      // Trim excess items to enforce limit
      const trimmedIds = Array.from(selectedEquipmentIds).slice(0, BASIC_COOKWARE_LIMIT);
      setSelectedEquipmentIds(new Set(trimmedIds));
    }
  }, [isPro, appliancesLoaded]);

  const loadAppliances = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/appliances", baseUrl);
      url.searchParams.set("_t", Date.now().toString());
      const response = await fetch(url, {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        const commonItems = data.filter((a: Appliance) => a.isCommon);
        setAppliances(data);
        // Pre-select up to 5 common items (limit will be enforced by the effect above)
        const itemsToSelect = commonItems.slice(0, BASIC_COOKWARE_LIMIT);
        const commonIds = new Set<number>(
          itemsToSelect.map((a: Appliance) => a.id),
        );
        setSelectedEquipmentIds(commonIds);
        setAppliancesLoaded(true);
      }
    } catch (err) {
      console.error("Error loading appliances:", err);
    } finally {
      setLoading(false);
    }
  };


  const equipmentSelectedCount = selectedEquipmentIds.size;
  const foodSelectedCount = selectedFoodIds.size;
  const isAtEquipmentLimit = !isPro && equipmentSelectedCount >= BASIC_COOKWARE_LIMIT;

  const toggleAppliance = useCallback((id: number) => {
    setSelectedEquipmentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        // Always allow deselecting
        newSet.delete(id);
      } else {
        // Check limit before adding
        if (!isPro && newSet.size >= BASIC_COOKWARE_LIMIT) {
          // At limit, don't add more
          return prev;
        }
        newSet.add(id);
      }
      return newSet;
    });
  }, [isPro]);

  const toggleCuisine = useCallback((id: string) => {
    setSelectedCuisines((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleDietaryPreference = useCallback((id: string) => {
    setDietaryPreferences((prev) => {
      const newSet = new Set(prev);
      if (id === "none") {
        // If selecting "none", clear all others
        return new Set(["none"]);
      } else {
        // Remove "none" if selecting something else
        newSet.delete("none");
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        // If nothing selected, default to "none"
        if (newSet.size === 0) {
          return new Set(["none"]);
        }
      }
      return newSet;
    });
  }, []);

  const toggleStorageArea = useCallback((id: string) => {
    setSelectedStorageAreas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        // Don't allow removing the last storage area
        if (newSet.size > 1) {
          newSet.delete(id);
        }
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleFood = useCallback((id: string) => {
    setSelectedFoodIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const deselectAllFoods = useCallback(() => {
    setSelectedFoodIds(new Set());
  }, []);

  const selectAllFoods = useCallback(() => {
    setSelectedFoodIds(new Set(STARTER_FOODS.map((f) => f.id)));
  }, []);

  const handlePreferencesToStorage = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStep("storage");
  };

  const handleStorageToFoods = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStep("foods");
  };

  const handleFoodsToCookware = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStep("cookware");
  };

  const handleCookwareToComplete = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Skip summary page and directly complete onboarding
    handleComplete();
  };

  const handleFoodsToPrev = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("storage");
  };

  const handleBackToPreferences = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("preferences");
  };

  const handleBackToStorage = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("storage");
  };

  const handleBackToFoods = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("foods");
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save user preferences
      const currentPrefs = await storage.getPreferences();
      await storage.setPreferences({
        ...currentPrefs,
        servingSize,
        dailyMeals,
        cuisinePreferences: Array.from(selectedCuisines),
        dietaryRestrictions: Array.from(dietaryPreferences).filter(d => d !== "none"),
        storageAreas: Array.from(selectedStorageAreas),
      });

      await storage.setCookware(Array.from(selectedEquipmentIds));

      const selectedFoods = STARTER_FOODS.filter((f) =>
        selectedFoodIds.has(f.id),
      );
      const today = new Date();

      // Get existing inventory to merge with (avoid duplicates)
      const existingInventory = await storage.getInventory();
      const existingByFdcId = new Map(
        existingInventory.filter(item => item.fdcId).map(item => [item.fdcId, item])
      );
      const existingByName = new Map(
        existingInventory.map(item => [item.name.toLowerCase(), item])
      );

      const newItems: FoodItem[] = [];
      const updatedItems: FoodItem[] = [];

      for (const food of selectedFoods) {
        const existingByFdc = existingByFdcId.get(food.fdcId);
        const existingByNameItem = existingByName.get(food.name.toLowerCase());
        const existing = existingByFdc || existingByNameItem;

        if (existing) {
          // Update existing item quantity
          updatedItems.push({
            ...existing,
            quantity: existing.quantity + food.defaultQuantity,
          });
        } else {
          // Create new item
          const expirationDate = new Date(today);
          expirationDate.setDate(expirationDate.getDate() + food.shelfLifeDays);

          newItems.push({
            id: generateId(),
            name: food.name,
            quantity: food.defaultQuantity,
            unit: food.unit,
            storageLocation: food.recommendedStorage,
            purchaseDate: today.toISOString(),
            expirationDate: expirationDate.toISOString(),
            category: food.category,
            fdcId: food.fdcId,
            nutrition: food.nutrition,
          });
        }
      }

      // Update existing items (skip sync queue - we'll save directly at the end)
      for (const item of updatedItems) {
        await storage.updateInventoryItem(item, { skipSync: true });
      }

      // Add new items (skip sync queue - we'll save directly at the end)
      if (newItems.length > 0) {
        await storage.addInventoryItems(newItems, { skipSync: true });
      }

      await storage.setOnboardingCompleted();
      markOnboardingComplete();

      // Save all data directly to database (not via sync queue)
      const saveResult = await storage.syncToCloud();
      if (!saveResult.success) {
        console.warn("Initial data save failed:", saveResult.error);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Main" as never }],
        }),
      );
    } catch (err) {
      console.error("Error completing onboarding:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  const handleCancelUpgrade = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main" as never }],
      }),
    );
  };

  const renderPreferencesStep = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.fixedHeader}>
        <View style={styles.categoryTitleContainer}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <Feather name="sliders" size={28} color={AppColors.primary} />
          </View>
          <ThemedText style={styles.categoryTitle}>Your Preferences</ThemedText>
          <ThemedText
            style={[styles.categoryDescription, { color: theme.textSecondary }]}
          >
            Help us personalize your experience
          </ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.equipmentList}
        contentContainerStyle={styles.equipmentListContent}
        showsVerticalScrollIndicator={true}
      >
        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Household Size
          </ThemedText>
          <ThemedText style={[styles.preferenceSectionDesc, { color: theme.textSecondary }]}>
            How many people are you cooking for?
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {SERVING_SIZE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setServingSize(option.value);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.preferenceOption,
                  {
                    backgroundColor: servingSize === option.value
                      ? `${AppColors.primary}20`
                      : theme.backgroundSecondary,
                    borderColor: servingSize === option.value
                      ? AppColors.primary
                      : theme.border,
                  },
                ]}
              >
                <ThemedText style={[
                  styles.preferenceOptionText,
                  { color: servingSize === option.value ? AppColors.primary : theme.text }
                ]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Daily Meals
          </ThemedText>
          <ThemedText style={[styles.preferenceSectionDesc, { color: theme.textSecondary }]}>
            How many meals do you typically have per day?
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {DAILY_MEALS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setDailyMeals(option.value);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.preferenceOption,
                  {
                    backgroundColor: dailyMeals === option.value
                      ? `${AppColors.primary}20`
                      : theme.backgroundSecondary,
                    borderColor: dailyMeals === option.value
                      ? AppColors.primary
                      : theme.border,
                  },
                ]}
              >
                <ThemedText style={[
                  styles.preferenceOptionText,
                  { color: dailyMeals === option.value ? AppColors.primary : theme.text }
                ]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Favorite Cuisines
          </ThemedText>
          <ThemedText style={[styles.preferenceSectionDesc, { color: theme.textSecondary }]}>
            Select cuisines you enjoy cooking (select multiple)
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {CUISINE_OPTIONS.map((cuisine) => {
              const isSelected = selectedCuisines.has(cuisine.id);
              return (
                <Pressable
                  key={cuisine.id}
                  onPress={() => toggleCuisine(cuisine.id)}
                  style={[
                    styles.preferenceOption,
                    {
                      backgroundColor: isSelected
                        ? `${AppColors.primary}20`
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={cuisine.icon}
                    size={14}
                    color={isSelected ? AppColors.primary : theme.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText style={[
                    styles.preferenceOptionText,
                    { color: isSelected ? AppColors.primary : theme.text }
                  ]}>
                    {cuisine.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Dietary Preferences
          </ThemedText>
          <ThemedText style={[styles.preferenceSectionDesc, { color: theme.textSecondary }]}>
            Any dietary restrictions or preferences?
          </ThemedText>
          <View style={styles.preferenceOptionsGrid}>
            {DIETARY_PREFERENCE_OPTIONS.map((pref) => {
              const isSelected = dietaryPreferences.has(pref.id);
              return (
                <Pressable
                  key={pref.id}
                  onPress={() => toggleDietaryPreference(pref.id)}
                  style={[
                    styles.preferenceOption,
                    {
                      backgroundColor: isSelected
                        ? `${AppColors.primary}20`
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={pref.icon}
                    size={14}
                    color={isSelected ? AppColors.primary : theme.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText style={[
                    styles.preferenceOptionText,
                    { color: isSelected ? AppColors.primary : theme.text }
                  ]}>
                    {pref.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <View style={styles.navigationButtons}>
          <GlassButton
            onPress={() => navigation.goBack()}
            variant="secondary"
            style={styles.navButton}
          >
            Back
          </GlassButton>
          <GlassButton
            onPress={handlePreferencesToStorage}
            variant="primary"
            style={styles.navButton}
          >
            Continue
          </GlassButton>
        </View>
      </View>
    </Animated.View>
  );

  const renderStorageStep = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.fixedHeader}>
        <View style={styles.categoryTitleContainer}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <Feather name="box" size={28} color={AppColors.primary} />
          </View>
          <ThemedText style={styles.categoryTitle}>Storage Areas</ThemedText>
          <ThemedText
            style={[styles.categoryDescription, { color: theme.textSecondary }]}
          >
            Where do you store your food?
          </ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.equipmentList}
        contentContainerStyle={styles.equipmentListContent}
        showsVerticalScrollIndicator={true}
      >
        <GlassCard style={styles.preferenceSection}>
          <ThemedText style={styles.preferenceSectionTitle}>
            Select Your Storage Areas
          </ThemedText>
          <ThemedText style={[styles.preferenceSectionDesc, { color: theme.textSecondary }]}>
            Choose which storage areas you have in your kitchen
          </ThemedText>
          <View style={styles.storageAreasGrid}>
            {DEFAULT_STORAGE_AREAS.map((area) => {
              const isSelected = selectedStorageAreas.has(area.id);
              return (
                <Pressable
                  key={area.id}
                  onPress={() => toggleStorageArea(area.id)}
                  style={[
                    styles.storageAreaCard,
                    {
                      backgroundColor: isSelected
                        ? `${AppColors.primary}15`
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.storageAreaIcon,
                      {
                        backgroundColor: isSelected
                          ? AppColors.primary
                          : theme.backgroundTertiary,
                      },
                    ]}
                  >
                    <Feather
                      name={area.icon}
                      size={24}
                      color={isSelected ? "#FFFFFF" : theme.textSecondary}
                    />
                  </View>
                  <ThemedText style={styles.storageAreaLabel}>
                    {area.label}
                  </ThemedText>
                  <ThemedText
                    style={[styles.storageAreaDesc, { color: theme.textSecondary }]}
                  >
                    {area.description}
                  </ThemedText>
                  {isSelected && (
                    <View style={[styles.storageCheckmark, { backgroundColor: AppColors.primary }]}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <View style={styles.storageNote}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.storageNoteText, { color: theme.textSecondary }]}>
            You can add custom storage areas later in Settings
          </ThemedText>
        </View>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <View style={styles.navigationButtons}>
          <GlassButton
            onPress={handleBackToPreferences}
            variant="secondary"
            style={styles.navButton}
          >
            Back
          </GlassButton>
          <GlassButton
            onPress={handleStorageToFoods}
            variant="primary"
            style={styles.navButton}
            disabled={selectedStorageAreas.size === 0}
          >
            Continue
          </GlassButton>
        </View>
      </View>
    </Animated.View>
  );

  const renderCookwareStep = () => {
    const groupedAppliances = EQUIPMENT_CATEGORIES.map((cat) => ({
      ...cat,
      appliances: appliances.filter(
        (a) => a.category.toLowerCase() === cat.id.toLowerCase(),
      ),
      selectedCount: appliances.filter(
        (a) =>
          a.category.toLowerCase() === cat.id.toLowerCase() &&
          selectedEquipmentIds.has(a.id),
      ).length,
    }));

    const toggleCategoryAll = (categoryId: string) => {
      const categoryApps = appliances.filter(
        (a) => a.category.toLowerCase() === categoryId.toLowerCase(),
      );
      const allSelected = categoryApps.every((a) =>
        selectedEquipmentIds.has(a.id),
      );

      setSelectedEquipmentIds((prev) => {
        const newSet = new Set(prev);
        if (allSelected) {
          categoryApps.forEach((a) => newSet.delete(a.id));
        } else {
          categoryApps.forEach((a) => newSet.add(a.id));
        }
        return newSet;
      });

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.stepContainer}
      >
        <View style={styles.allCookwareHeader}>
          <View
            style={[
              styles.successIconContainer,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <Feather name="tool" size={36} color={AppColors.primary} />
          </View>
          <ThemedText style={styles.allCookwareTitle}>
            Your Kitchen Equipment
          </ThemedText>
          <ThemedText
            style={[styles.allCookwareSubtitle, { color: theme.textSecondary }]}
          >
            Select the cookware and appliances you have in your kitchen.
          </ThemedText>
        </View>

        <View style={styles.allCookwareStats}>
          <View
            style={[
              styles.statBadge,
              { backgroundColor: isAtEquipmentLimit ? `${AppColors.warning}15` : `${AppColors.primary}15` },
            ]}
          >
            <Feather name="tool" size={14} color={isAtEquipmentLimit ? AppColors.warning : AppColors.primary} />
            <ThemedText
              style={[styles.statBadgeText, { color: isAtEquipmentLimit ? AppColors.warning : AppColors.primary }]}
            >
              {isPro ? `${equipmentSelectedCount} Cookware` : `${equipmentSelectedCount}/${BASIC_COOKWARE_LIMIT} Cookware`}
            </ThemedText>
          </View>
          {isAtEquipmentLimit && (
            <ThemedText style={[styles.limitWarning, { color: AppColors.warning }]}>
              Basic plan limit reached. Upgrade for unlimited cookware.
            </ThemedText>
          )}
        </View>

        <ScrollView
          style={styles.allCookwareList}
          contentContainerStyle={styles.allCookwareListContent}
          showsVerticalScrollIndicator={true}
        >
          {groupedAppliances.map((group) => {
            if (group.appliances.length === 0) return null;
            const allInGroupSelected =
              group.selectedCount === group.appliances.length;

            return (
              <GlassCard key={group.id} style={styles.cookwareCategorySection}>
                <View style={styles.cookwareCategoryHeader}>
                  <View style={styles.cookwareCategoryLeft}>
                    <View
                      style={[
                        styles.cookwareCategoryIcon,
                        { backgroundColor: `${AppColors.primary}15` },
                      ]}
                    >
                      <Feather
                        name={ICON_MAP[group.icon] || "box"}
                        size={16}
                        color={AppColors.primary}
                      />
                    </View>
                    <ThemedText style={styles.cookwareCategoryTitle}>
                      {group.label}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.cookwareCategoryCount,
                        { color: theme.textSecondary },
                      ]}
                    >
                      ({group.selectedCount}/{group.appliances.length})
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => toggleCategoryAll(group.id)}>
                    <ThemedText
                      style={[
                        styles.cookwareCategoryToggle,
                        { color: AppColors.primary },
                      ]}
                    >
                      {allInGroupSelected ? "Deselect All" : "Select All"}
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.cookwareCategoryItems}>
                  {group.appliances.map((appliance) => {
                    const isSelected = selectedEquipmentIds.has(appliance.id);
                    const isDisabled = !isSelected && isAtEquipmentLimit;
                    return (
                      <Pressable
                        key={appliance.id}
                        onPress={() => {
                          if (isDisabled) return;
                          if (Platform.OS !== "web") {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                          }
                          toggleAppliance(appliance.id);
                        }}
                        style={[
                          styles.cookwareChip,
                          {
                            backgroundColor: isSelected
                              ? `${AppColors.primary}20`
                              : theme.backgroundSecondary,
                            borderColor: isSelected
                              ? AppColors.primary
                              : theme.border,
                            opacity: isDisabled ? 0.4 : 1,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.cookwareChipText,
                            {
                              color: isSelected
                                ? AppColors.primary
                                : theme.text,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {appliance.name}
                        </ThemedText>
                        {isSelected ? (
                          <Feather
                            name="check"
                            size={12}
                            color={AppColors.primary}
                            style={{ marginLeft: 4 }}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>
            );
          })}
        </ScrollView>

        <View style={styles.fixedFooter}>
          <View style={styles.navigationButtons}>
            <GlassButton
              onPress={handleBackToFoods}
              variant="secondary"
              style={styles.navButton}
            >
              Back
            </GlassButton>
            <GlassButton
              onPress={handleCookwareToComplete}
              variant="primary"
              style={styles.navButton}
              disabled={saving}
            >
              {saving ? "Saving..." : "Start Using App"}
            </GlassButton>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFoodsStep = () => {
    const allFoodsSelected = foodSelectedCount === STARTER_FOODS.length;
    const groupedFoods = STARTER_FOODS.reduce(
      (acc, food) => {
        if (!acc[food.recommendedStorage]) {
          acc[food.recommendedStorage] = [];
        }
        acc[food.recommendedStorage].push(food);
        return acc;
      },
      {} as Record<string, StarterFood[]>,
    );

    const storageOrder: Array<"fridge" | "freezer" | "pantry" | "counter"> = [
      "fridge",
      "pantry",
      "counter",
      "freezer",
    ];

    return (
      <Animated.View
        entering={SlideInRight.duration(300)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.stepContainer}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="shopping-bag" size={48} color={AppColors.primary} />
          </View>
          <ThemedText style={styles.title}>Stock Your Kitchen</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Select common items you already have. We've organized them by where
            they're best stored.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={allFoodsSelected ? deselectAllFoods : selectAllFoods}
            style={styles.selectAllButton}
          >
            <ThemedText
              style={[styles.selectAllText, { color: AppColors.primary }]}
            >
              {allFoodsSelected ? "Deselect All" : "Select All"}
            </ThemedText>
          </Pressable>
          <ThemedText
            style={[styles.selectedCount, { color: theme.textSecondary }]}
          >
            {foodSelectedCount} selected
          </ThemedText>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {storageOrder.map((storageType) => {
            const foods = groupedFoods[storageType];
            if (!foods || foods.length === 0) return null;
            const storageInfo = STORAGE_LABELS[storageType];

            return (
              <View key={storageType} style={styles.storageSection}>
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: `${storageInfo.color}15` },
                    ]}
                  >
                    <Feather
                      name={storageInfo.icon}
                      size={16}
                      color={storageInfo.color}
                    />
                  </View>
                  <ThemedText style={styles.sectionTitle}>
                    {storageInfo.label}
                  </ThemedText>
                </View>
                {foods.map((food) => (
                  <FoodItemRow
                    key={food.id}
                    food={food}
                    isSelected={selectedFoodIds.has(food.id)}
                    onToggle={() => toggleFood(food.id)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.fixedFooter}>
          <View style={styles.navigationButtons}>
            <GlassButton
              onPress={handleFoodsToPrev}
              variant="secondary"
              style={styles.navButton}
            >
              Back
            </GlassButton>
            <GlassButton
              onPress={handleFoodsToCookware}
              variant="primary"
              style={styles.navButton}
            >
              Continue
            </GlassButton>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderCompleteStep = () => {
    const selectedAppliances = appliances.filter((a) =>
      selectedEquipmentIds.has(a.id),
    );
    const selectedFoods = STARTER_FOODS.filter((f) =>
      selectedFoodIds.has(f.id),
    );
    const categoryCounts = EQUIPMENT_CATEGORIES.map((cat) => ({
      ...cat,
      count: selectedAppliances.filter(
        (a) => a.category.toLowerCase() === cat.id.toLowerCase(),
      ).length,
    }));

    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.stepContainer}
      >
        <View style={styles.summaryHeader}>
          <View
            style={[
              styles.summaryIconContainer,
              { backgroundColor: `${AppColors.success}15` },
            ]}
          >
            <Feather name="check-circle" size={48} color={AppColors.success} />
          </View>
          <ThemedText style={styles.summaryTitle}>You're All Set!</ThemedText>
          <ThemedText
            style={[styles.summarySubtitle, { color: theme.textSecondary }]}
          >
            {equipmentSelectedCount} equipment items and {foodSelectedCount}{" "}
            food items ready to go.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.summaryList}
          showsVerticalScrollIndicator={false}
        >
          {appliances.length > 0 ? (
            <GlassCard style={styles.summaryCategoryCard}>
              <View style={styles.summaryCategoryHeader}>
                <Feather name="tool" size={20} color={AppColors.primary} />
                <ThemedText style={styles.summaryCategoryName}>
                  Kitchen Equipment
                </ThemedText>
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: `${AppColors.primary}15` },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.countBadgeText,
                      { color: AppColors.primary },
                    ]}
                  >
                    {equipmentSelectedCount}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.summaryItems}>
                {appliances.map((a) => {
                  const isSelected = selectedEquipmentIds.has(a.id);
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }
                        toggleAppliance(a.id);
                      }}
                      style={[
                        styles.summaryItemChip,
                        {
                          backgroundColor: isSelected
                            ? `${AppColors.primary}20`
                            : theme.backgroundSecondary,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? AppColors.primary
                            : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.summaryItemText,
                          {
                            color: isSelected
                              ? AppColors.primary
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {a.name}
                      </ThemedText>
                      {isSelected ? (
                        <Feather
                          name="check"
                          size={12}
                          color={AppColors.primary}
                          style={{ marginLeft: 4 }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          ) : null}

          {STARTER_FOODS.length > 0 ? (
            <GlassCard style={styles.summaryCategoryCard}>
              <View style={styles.summaryCategoryHeader}>
                <Feather
                  name="shopping-bag"
                  size={20}
                  color={AppColors.primary}
                />
                <ThemedText style={styles.summaryCategoryName}>
                  Pantry Items
                </ThemedText>
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: `${AppColors.primary}15` },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.countBadgeText,
                      { color: AppColors.primary },
                    ]}
                  >
                    {foodSelectedCount}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.summaryItems}>
                {STARTER_FOODS.map((f) => {
                  const isSelected = selectedFoodIds.has(f.id);
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => {
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }
                        toggleFood(f.id);
                      }}
                      style={[
                        styles.summaryItemChip,
                        {
                          backgroundColor: isSelected
                            ? `${AppColors.primary}20`
                            : theme.backgroundSecondary,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? AppColors.primary
                            : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.summaryItemText,
                          {
                            color: isSelected
                              ? AppColors.primary
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {f.name}
                      </ThemedText>
                      {isSelected ? (
                        <Feather
                          name="check"
                          size={12}
                          color={AppColors.primary}
                          style={{ marginLeft: 4 }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          ) : null}
        </ScrollView>

        <View style={styles.summaryNote}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText
            style={[styles.summaryNoteText, { color: theme.textSecondary }]}
          >
            You can update these anytime in Settings
          </ThemedText>
        </View>

        <View style={styles.summaryActions}>
          <GlassButton
            onPress={() => setStep("cookware")}
            variant="secondary"
            style={styles.editButton}
          >
            Back
          </GlassButton>
          <GlassButton
            onPress={handleComplete}
            variant="primary"
            disabled={saving}
            style={styles.completeButton}
          >
            {saving ? "Saving..." : "Start Using App"}
          </GlassButton>
        </View>
      </Animated.View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
    >
      {step === "preferences" && renderPreferencesStep()}
      {step === "storage" && renderStorageStep()}
      {step === "foods" && renderFoodsStep()}
      {step === "cookware" && renderCookwareStep()}
      {step === "complete" && renderCompleteStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  welcomeScrollView: {
    flex: 1,
  },
  welcomeScrollContent: {
    flexGrow: 1,
  },
  welcomeHeader: {
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  upgradeHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  cancelButton: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    padding: Spacing.sm,
    zIndex: 1,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: Spacing.xs,
  },
  upgradeSubtitle: {
    fontSize: 15,
    textAlign: "center" as const,
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  welcomeIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  defaultsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  defaultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  defaultsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  defaultsDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  defaultsPreviewScroll: {
    maxHeight: 160,
  },
  defaultsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  welcomeActions: {
    gap: Spacing.sm,
  },
  primaryButton: {
    width: "100%",
  },
  secondaryButton: {
    width: "100%",
  },
  appIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  appIconImage: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },
  featuresContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  featureDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
  welcomeFooter: {
    marginTop: "auto",
    gap: Spacing.md,
  },
  quickSetupCard: {
    padding: Spacing.md,
  },
  quickSetupTop: {
    marginBottom: Spacing.sm,
  },
  quickSetupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quickSetupIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  quickSetupTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  quickSetupSubtitle: {
    fontSize: 12,
  },
  quickSetupText: {
    fontSize: 13,
    lineHeight: 18,
  },
  quickSetupPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  previewItemText: {
    fontSize: 11,
    fontWeight: "500",
  },
  quickSetupStats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  quickSetupStat: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  customizeLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  customizeLinkText: {
    fontSize: 14,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  selectAllButton: {
    paddingVertical: Spacing.xs,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedCount: {
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.md,
  },
  storageSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  foodItem: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  foodItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  foodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  foodImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  foodMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  storageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  storageTagText: {
    fontSize: 10,
    fontWeight: "500",
  },
  quantityText: {
    fontSize: 12,
  },
  fixedHeader: {
    flexShrink: 0,
  },
  fixedFooter: {
    flexShrink: 0,
    paddingTop: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepIndicator: {
    fontSize: 14,
  },
  categoryTitleContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  categoryDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  categoryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  selectedCountText: {
    fontSize: 14,
  },
  equipmentList: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  equipmentListContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  equipmentItem: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "500",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  navigationButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
  },
  summaryHeader: {
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  summarySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  summaryList: {
    flex: 1,
  },
  summaryCategoryCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryCategoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  summaryItemChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  summaryItemText: {
    fontSize: 13,
  },
  summaryNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  summaryNoteText: {
    fontSize: 13,
  },
  summaryActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  editButton: {
    flex: 1,
  },
  completeButton: {
    flex: 2,
  },
  allCookwareHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  allCookwareTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  allCookwareSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  allCookwareStats: {
    flexDirection: "column",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  limitWarning: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  statBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  allCookwareList: {
    flex: 1,
  },
  allCookwareListContent: {
    paddingBottom: Spacing.md,
  },
  cookwareCategorySection: {
    marginBottom: Spacing.lg,
  },
  cookwareCategoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cookwareCategoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cookwareCategoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cookwareCategoryTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cookwareCategoryCount: {
    fontSize: 13,
  },
  cookwareCategoryToggle: {
    fontSize: 13,
    fontWeight: "500",
  },
  cookwareCategoryItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  cookwareChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  cookwareChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  fullWidthButton: {
    width: "100%",
  },
  getStartedButton: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  welcomeHint: {
    fontSize: 14,
    textAlign: "center",
  },
  authSection: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    paddingTop: Spacing.sm,
  },
  planSelectionContainer: {
    marginBottom: Spacing.md,
  },
  planSelectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: 2,
  },
  planSelectionSubtitle: {
    fontSize: 13,
    textAlign: "center" as const,
    marginBottom: Spacing.sm,
  },
  featuresListContainer: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  featuresListTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: Spacing.xs,
  },
  featuresGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  featureGridItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    width: "50%" as const,
    marginBottom: 4,
  },
  featureGridItemText: {
    fontSize: 11,
  },
  featureItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
    marginBottom: 6,
  },
  featureItemText: {
    fontSize: 14,
  },
  planCardsRow: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
  },
  planCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    position: "relative" as const,
  },
  planCardHeader: {
    gap: 2,
  },
  planCardName: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  planCardPrice: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  planCardInterval: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  planCardMonthly: {
    fontSize: 11,
    marginTop: 1,
  },
  planCardRadio: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.2)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  savingsBadge: {
    position: "absolute" as const,
    top: -6,
    right: 8,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  authTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    marginBottom: Spacing.sm,
  },
  authErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  authErrorText: {
    fontSize: 13,
    flex: 1,
  },
  authInputContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  authInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  authInputIcon: {
    marginRight: Spacing.sm,
  },
  authInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  authEyeButton: {
    padding: Spacing.xs,
  },
  authButton: {
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  authSwitchButton: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  authSwitchText: {
    fontSize: 13,
  },
  authDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  authDivider: {
    flex: 1,
    height: 1,
  },
  authDividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: 13,
  },
  authSocialButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  authSocialButton: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  authSocialButtonText: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  authGoogleIcon: {
    width: 20,
    height: 20,
  },
  // Preference step styles
  preferenceSection: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  preferenceSectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: Spacing.xs,
  },
  preferenceSectionDesc: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  preferenceOptionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
  },
  preferenceOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
  },
  preferenceOptionText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  // Storage step styles
  storageAreasGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.md,
  },
  storageAreaCard: {
    width: "47%" as const,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  storageAreaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  storageAreaLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    marginBottom: Spacing.xs,
  },
  storageAreaDesc: {
    fontSize: 12,
    textAlign: "center" as const,
  },
  storageCheckmark: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  storageNote: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  storageNoteText: {
    fontSize: 13,
    flex: 1,
  },
});
