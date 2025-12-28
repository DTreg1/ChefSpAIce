import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome } from "@expo/vector-icons";
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
import { useNavigation, CommonActions } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const AppIcon = require("../../assets/images/icon.png");
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, FoodItem, generateId, NutritionInfo } from "@/lib/storage";
import { STARTER_FOOD_IMAGES } from "@/lib/food-images";
import { getApiUrl } from "@/lib/query-client";
import { useOnboardingStatus } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";

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
  | "welcome"
  | "equipment-category"
  | "all-cookware"
  | "foods"
  | "summary";

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
  const { markOnboardingComplete } = useOnboardingStatus();
  const { signIn, signUp, signInWithApple, signInWithGoogle, continueAsGuest, isAppleAuthAvailable, isGoogleAuthAvailable } = useAuth();

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedFoodIds, setSelectedFoodIds] = useState<Set<string>>(
    new Set(STARTER_FOODS.map((f) => f.id)),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<"apple" | "google" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    loadAppliances();
  }, []);

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
        const commonIds = new Set<number>(
          commonItems.map((a: Appliance) => a.id),
        );
        setSelectedEquipmentIds(commonIds);
      }
    } catch (err) {
      console.error("Error loading appliances:", err);
    } finally {
      setLoading(false);
    }
  };

  const proceedToNextStep = () => {
    setStep("all-cookware");
  };

  const handleAuthSubmit = async () => {
    setAuthError(null);

    if (!email.trim()) {
      setAuthError("Please enter an email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAuthError("Please enter a valid email address");
      return;
    }

    if (!password.trim()) {
      setAuthError("Please enter a password");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters");
      return;
    }

    setIsAuthLoading(true);

    try {
      const result = isSignUp
        ? await signUp(email.trim(), password, displayName.trim() || undefined)
        : await signIn(email.trim(), password);

      if (result.success) {
        proceedToNextStep();
      } else {
        setAuthError(result.error || "Authentication failed");
      }
    } catch (err) {
      setAuthError("An unexpected error occurred");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    continueAsGuest();
    proceedToNextStep();
  };

  const handleAppleSignIn = async () => {
    setAuthError(null);
    setIsSocialLoading("apple");
    try {
      const result = await signInWithApple();
      if (result.success) {
        proceedToNextStep();
      } else {
        setAuthError(result.error || "Apple sign in failed");
      }
    } catch (err) {
      setAuthError("An unexpected error occurred");
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSocialLoading("google");
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        proceedToNextStep();
      } else {
        setAuthError(result.error || "Google sign in failed");
      }
    } catch (err) {
      setAuthError("An unexpected error occurred");
    } finally {
      setIsSocialLoading(null);
    }
  };

  const currentCategory = EQUIPMENT_CATEGORIES[categoryIndex];
  const categoryAppliances = useMemo(() => {
    return appliances.filter(
      (a) => a.category.toLowerCase() === currentCategory?.id.toLowerCase(),
    );
  }, [appliances, currentCategory]);

  const equipmentSelectedCount = selectedEquipmentIds.size;
  const foodSelectedCount = selectedFoodIds.size;
  const categorySelectedCount = useMemo(() => {
    return categoryAppliances.filter((a) => selectedEquipmentIds.has(a.id))
      .length;
  }, [categoryAppliances, selectedEquipmentIds]);

  const toggleAppliance = useCallback((id: number) => {
    setSelectedEquipmentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
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

  const selectAllInCategory = useCallback(() => {
    setSelectedEquipmentIds((prev) => {
      const newSet = new Set(prev);
      categoryAppliances.forEach((a) => newSet.add(a.id));
      return newSet;
    });
  }, [categoryAppliances]);

  const deselectAllInCategory = useCallback(() => {
    setSelectedEquipmentIds((prev) => {
      const newSet = new Set(prev);
      categoryAppliances.forEach((a) => newSet.delete(a.id));
      return newSet;
    });
  }, [categoryAppliances]);

  const selectAllFoods = useCallback(() => {
    setSelectedFoodIds(new Set(STARTER_FOODS.map((f) => f.id)));
  }, []);

  const deselectAllFoods = useCallback(() => {
    setSelectedFoodIds(new Set());
  }, []);

  const handleAcceptDefaults = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStep("all-cookware");
  };

  const handleCustomize = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("equipment-category");
  };

  const handleNextCategory = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (categoryIndex < EQUIPMENT_CATEGORIES.length - 1) {
      setCategoryIndex(categoryIndex + 1);
    } else {
      setStep("foods");
    }
  };

  const handlePrevCategory = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (categoryIndex > 0) {
      setCategoryIndex(categoryIndex - 1);
    } else {
      setStep("welcome");
    }
  };

  const handleFoodsToPrev = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("welcome");
  };

  const handleFoodsToSummary = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("summary");
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await storage.setCookware(Array.from(selectedEquipmentIds));

      const selectedFoods = STARTER_FOODS.filter((f) =>
        selectedFoodIds.has(f.id),
      );
      const today = new Date();

      const foodItems: FoodItem[] = selectedFoods.map((food) => {
        const expirationDate = new Date(today);
        expirationDate.setDate(expirationDate.getDate() + food.shelfLifeDays);

        return {
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
        };
      });

      if (foodItems.length > 0) {
        await storage.addInventoryItems(foodItems);
      }

      await storage.setOnboardingCompleted();
      markOnboardingComplete();

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

  const FEATURES = [
    {
      icon: "package" as keyof typeof Feather.glyphMap,
      title: "Track Your Food",
      description: "Never forget what's in your fridge, freezer, or pantry",
      color: "#3B82F6",
    },
    {
      icon: "clock" as keyof typeof Feather.glyphMap,
      title: "Reduce Waste",
      description: "Get alerts before food expires so nothing goes bad",
      color: "#F59E0B",
    },
    {
      icon: "book-open" as keyof typeof Feather.glyphMap,
      title: "Smart Recipes",
      description: "AI generates recipes from ingredients you already have",
      color: "#8B5CF6",
    },
  ];

  const PREVIEW_ITEMS = [
    { icon: "box" as keyof typeof Feather.glyphMap, label: "Fridge" },
    { icon: "thermometer" as keyof typeof Feather.glyphMap, label: "Freezer" },
    { icon: "archive" as keyof typeof Feather.glyphMap, label: "Pantry" },
    { icon: "sun" as keyof typeof Feather.glyphMap, label: "Counter" },
  ];

  const renderWelcomeStep = () => (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <KeyboardAwareScrollViewCompat
        style={styles.welcomeScrollView}
        contentContainerStyle={styles.welcomeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeHeader}>
          <Animated.View
            entering={FadeIn.delay(100).duration(500)}
            style={styles.appIconContainer}
          >
            <Image
              source={AppIcon}
              style={styles.appIconImage}
              resizeMode="cover"
            />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <ThemedText style={styles.appName}>ChefSpAIce</ThemedText>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(300).duration(400)}>
            <ThemedText
              style={[styles.appTagline, { color: theme.textSecondary }]}
            >
              Your AI-powered kitchen companion
            </ThemedText>
          </Animated.View>
        </View>

        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeIn.delay(400 + index * 100).duration(300)}
            >
              <GlassCard contentStyle={styles.featureCard}>
                <View
                  style={[
                    styles.featureIconContainer,
                    { backgroundColor: `${feature.color}15` },
                  ]}
                >
                  <Feather
                    name={feature.icon}
                    size={18}
                    color={feature.color}
                  />
                </View>
                <View style={styles.featureTextContainer}>
                  <ThemedText style={styles.featureTitle}>
                    {feature.title}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.featureDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {feature.description}
                  </ThemedText>
                </View>
              </GlassCard>
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeIn.delay(700).duration(400)}
          style={styles.welcomeFooter}
        >
          <GlassCard style={styles.authFormCard}>
            <ThemedText style={styles.authFormTitle}>
              {isSignUp ? "Create Account" : "Sign In"}
            </ThemedText>
            <ThemedText style={[styles.authFormSubtitle, { color: theme.textSecondary }]}>
              {isSignUp
                ? "Sign up to sync your data across devices"
                : "Sign in to access your synced data"}
            </ThemedText>

            {authError ? (
              <View style={[styles.authErrorContainer, { backgroundColor: `${AppColors.error}15` }]}>
                <Feather name="alert-circle" size={16} color={AppColors.error} />
                <ThemedText style={{ color: AppColors.error, marginLeft: Spacing.xs, flex: 1 }}>
                  {authError}
                </ThemedText>
              </View>
            ) : null}

            {isSignUp ? (
              <View style={styles.authInputGroup}>
                <ThemedText style={styles.authInputLabel}>
                  Display Name (optional)
                </ThemedText>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="How should we call you?"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.authInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.glass.background,
                      borderColor: theme.glass.border,
                    },
                  ]}
                  autoCapitalize="words"
                  autoCorrect={false}
                  data-testid="input-display-name"
                />
              </View>
            ) : null}

            <View style={styles.authInputGroup}>
              <ThemedText style={styles.authInputLabel}>Email</ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.authInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.glass.background,
                    borderColor: theme.glass.border,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                data-testid="input-email"
              />
            </View>

            <View style={styles.authInputGroup}>
              <ThemedText style={styles.authInputLabel}>Password</ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.authInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.glass.background,
                    borderColor: theme.glass.border,
                  },
                ]}
                secureTextEntry
                autoComplete="password"
                data-testid="input-password"
              />
            </View>

            <Pressable
              style={[
                styles.authSubmitButton,
                { backgroundColor: AppColors.primary },
                isAuthLoading && styles.authButtonDisabled,
              ]}
              onPress={handleAuthSubmit}
              disabled={isAuthLoading}
              data-testid="button-auth-submit"
            >
              {isAuthLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.authSubmitButtonText}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              style={styles.authToggleButton}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              data-testid="button-toggle-auth-mode"
            >
              <ThemedText style={{ color: theme.textSecondary }}>
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <ThemedText style={{ color: AppColors.primary }}>
                  {isSignUp ? "Sign In" : "Sign Up"}
                </ThemedText>
              </ThemedText>
            </Pressable>
          </GlassCard>

          {(isAppleAuthAvailable || isGoogleAuthAvailable) ? (
            <>
              <View style={styles.authDividerContainer}>
                <View style={[styles.authDivider, { backgroundColor: theme.glass.border }]} />
                <ThemedText style={[styles.authDividerText, { color: theme.textSecondary }]}>
                  or continue with
                </ThemedText>
                <View style={[styles.authDivider, { backgroundColor: theme.glass.border }]} />
              </View>

              <View style={styles.socialButtonsContainer}>
                {Platform.OS === "ios" && isAppleAuthAvailable ? (
                  <Pressable
                    style={[
                      styles.socialButton,
                      { backgroundColor: theme.text },
                      (isAuthLoading || isSocialLoading) && styles.authButtonDisabled,
                    ]}
                    onPress={handleAppleSignIn}
                    disabled={isAuthLoading || !!isSocialLoading}
                    data-testid="button-apple-signin"
                  >
                    {isSocialLoading === "apple" ? (
                      <ActivityIndicator color={theme.backgroundRoot} size="small" />
                    ) : (
                      <>
                        <FontAwesome name="apple" size={20} color={theme.backgroundRoot} />
                        <ThemedText style={[styles.socialButtonText, { color: theme.backgroundRoot }]}>
                          Continue with Apple
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                ) : null}

                {Platform.OS === "android" && isGoogleAuthAvailable ? (
                  <Pressable
                    style={[
                      styles.socialButton,
                      { backgroundColor: "#4285F4" },
                      (isAuthLoading || isSocialLoading) && styles.authButtonDisabled,
                    ]}
                    onPress={handleGoogleSignIn}
                    disabled={isAuthLoading || !!isSocialLoading}
                    data-testid="button-google-signin"
                  >
                    {isSocialLoading === "google" ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <FontAwesome name="google" size={18} color="#FFFFFF" />
                        <ThemedText style={[styles.socialButtonText, { color: "#FFFFFF" }]}>
                          Continue with Google
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          <View style={styles.authDividerContainer}>
            <View style={[styles.authDivider, { backgroundColor: theme.glass.border }]} />
            <ThemedText style={[styles.authDividerText, { color: theme.textSecondary }]}>
              or
            </ThemedText>
            <View style={[styles.authDivider, { backgroundColor: theme.glass.border }]} />
          </View>

          <GlassCard onPress={handleContinueAsGuest}>
            <View style={styles.guestContent}>
              <View style={[styles.guestIcon, { backgroundColor: theme.glass.background }]}>
                <Feather name="user-x" size={20} color={theme.textSecondary} />
              </View>
              <View style={styles.guestText}>
                <ThemedText style={{ fontWeight: "600" }}>
                  Continue as Guest
                </ThemedText>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                  Use the app without syncing. You can sign in later.
                </ThemedText>
              </View>
              <View style={styles.guestChevron}>
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </View>
            </View>
          </GlassCard>

          <View style={styles.authInfoCard}>
            <Feather name="cloud" size={20} color={AppColors.primary} />
            <ThemedText style={[styles.authInfoText, { color: theme.textSecondary }]}>
              Signing in enables cloud backup and syncs your inventory, recipes, and meal plans across all your devices.
            </ThemedText>
          </View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </Animated.View>
  );

  const renderEquipmentCategoryStep = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
      key={`category-${categoryIndex}`}
    >
      <View style={styles.fixedHeader}>
        <View style={styles.categoryHeader}>
          <View style={styles.progressContainer}>
            {EQUIPMENT_CATEGORIES.map((cat, idx) => (
              <View
                key={cat.id}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      idx < categoryIndex
                        ? AppColors.primary
                        : idx === categoryIndex
                          ? AppColors.primary
                          : theme.backgroundTertiary,
                    opacity: idx === categoryIndex ? 1 : 0.5,
                  },
                ]}
              />
            ))}
          </View>
          <ThemedText
            style={[styles.stepIndicator, { color: theme.textSecondary }]}
          >
            {categoryIndex + 1} of {EQUIPMENT_CATEGORIES.length}
          </ThemedText>
        </View>

        <View style={styles.categoryTitleContainer}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <Feather
              name={ICON_MAP[currentCategory.icon] || "box"}
              size={28}
              color={AppColors.primary}
            />
          </View>
          <ThemedText style={styles.categoryTitle}>
            {currentCategory.label}
          </ThemedText>
          <ThemedText
            style={[styles.categoryDescription, { color: theme.textSecondary }]}
          >
            {currentCategory.description}
          </ThemedText>
        </View>

        <View style={styles.categoryActions}>
          <Pressable
            onPress={
              categorySelectedCount === categoryAppliances.length
                ? deselectAllInCategory
                : selectAllInCategory
            }
            style={styles.selectAllButton}
          >
            <ThemedText
              style={[styles.selectAllText, { color: AppColors.primary }]}
            >
              {categorySelectedCount === categoryAppliances.length
                ? "Deselect All"
                : "Select All"}
            </ThemedText>
          </Pressable>
          <ThemedText
            style={[styles.selectedCountText, { color: theme.textSecondary }]}
          >
            {categorySelectedCount} selected
          </ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.equipmentList}
        contentContainerStyle={styles.equipmentListContent}
        showsVerticalScrollIndicator={true}
      >
        {categoryAppliances.map((appliance) => (
          <EquipmentItem
            key={appliance.id}
            appliance={appliance}
            isSelected={selectedEquipmentIds.has(appliance.id)}
            onToggle={() => toggleAppliance(appliance.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.fixedFooter}>
        <View style={styles.navigationButtons}>
          <Button
            onPress={handlePrevCategory}
            variant="secondary"
            style={styles.navButton}
          >
            {categoryIndex === 0 ? "Back" : "Previous"}
          </Button>
          <Button
            onPress={handleNextCategory}
            variant="primary"
            style={styles.navButton}
          >
            {categoryIndex === EQUIPMENT_CATEGORIES.length - 1
              ? "Next"
              : "Next"}
          </Button>
        </View>
      </View>
    </Animated.View>
  );

  const handleAllCookwareComplete = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSaving(true);
    try {
      await storage.setCookware(Array.from(selectedEquipmentIds));

      const today = new Date();
      const foodItems: FoodItem[] = STARTER_FOODS.map((food) => {
        const expirationDate = new Date(today);
        expirationDate.setDate(expirationDate.getDate() + food.shelfLifeDays);
        return {
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
        };
      });

      if (foodItems.length > 0) {
        await storage.addInventoryItems(foodItems);
      }

      await storage.setOnboardingCompleted();
      markOnboardingComplete();

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

  const renderAllCookwareStep = () => {
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
              { backgroundColor: `${AppColors.success}15` },
            ]}
          >
            <Feather name="check-circle" size={36} color={AppColors.success} />
          </View>
          <ThemedText style={styles.allCookwareTitle}>
            Kitchen Setup Complete!
          </ThemedText>
          <ThemedText
            style={[styles.allCookwareSubtitle, { color: theme.textSecondary }]}
          >
            Review your cookware below. {STARTER_FOODS.length} starter foods
            will be added to your inventory.
          </ThemedText>
        </View>

        <View style={styles.allCookwareStats}>
          <View
            style={[
              styles.statBadge,
              { backgroundColor: `${AppColors.primary}15` },
            ]}
          >
            <Feather name="tool" size={14} color={AppColors.primary} />
            <ThemedText
              style={[styles.statBadgeText, { color: AppColors.primary }]}
            >
              {equipmentSelectedCount} Cookware
            </ThemedText>
          </View>
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
                    return (
                      <Pressable
                        key={appliance.id}
                        onPress={() => {
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
          <Button
            onPress={handleAllCookwareComplete}
            variant="primary"
            disabled={saving}
            style={styles.fullWidthButton}
          >
            {saving ? "Saving..." : "Get Started"}
          </Button>
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
            <Button
              onPress={handleFoodsToPrev}
              variant="secondary"
              style={styles.navButton}
            >
              Back
            </Button>
            <Button
              onPress={handleFoodsToSummary}
              variant="primary"
              style={styles.navButton}
            >
              Review
            </Button>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderSummaryStep = () => {
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
          <Button
            onPress={() => setStep("foods")}
            variant="secondary"
            style={styles.editButton}
          >
            Edit
          </Button>
          <Button
            onPress={handleComplete}
            variant="primary"
            disabled={saving}
            style={styles.completeButton}
          >
            {saving ? "Saving..." : "Get Started"}
          </Button>
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
      {step === "welcome" && renderWelcomeStep()}
      {step === "equipment-category" && renderEquipmentCategoryStep()}
      {step === "all-cookware" && renderAllCookwareStep()}
      {step === "foods" && renderFoodsStep()}
      {step === "summary" && renderSummaryStep()}
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
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
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
    width: 88,
    height: 88,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  appIconImage: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  featuresContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 16,
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
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  authFormCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  authFormTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  authFormSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  authErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  authInputGroup: {
    marginBottom: Spacing.md,
  },
  authInputLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  authInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  authSubmitButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authSubmitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  authToggleButton: {
    alignItems: "center",
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  authDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  authDivider: {
    flex: 1,
    height: 1,
  },
  authDividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 13,
  },
  socialButtonsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  socialButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  socialButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  guestContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  guestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  guestText: {
    flex: 1,
  },
  guestChevron: {
    alignSelf: "stretch",
    justifyContent: "center",
    paddingLeft: Spacing.sm,
  },
  authInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  authInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
