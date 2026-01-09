import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Animated as RNAnimated,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  FoodSearchAutocomplete,
  FoodSearchResult as SearchFoodItem,
} from "@/components/FoodSearchAutocomplete";
import { getApiUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { StorageSuggestionBadge } from "@/components/StorageSuggestionBadge";
import { NutritionSection } from "@/components/NutritionSection";
import { useTheme } from "@/hooks/useTheme";
import {
  useShelfLifeSuggestion,
  ConfidenceLevel,
} from "@/hooks/useShelfLifeSuggestion";
import {
  useStorageSuggestion,
  useStorageRecorder,
} from "@/hooks/useStorageSuggestion";
import {
  Spacing,
  BorderRadius,
  AppColors,
  GlassEffect,
} from "@/constants/theme";
import {
  storage,
  FoodItem,
  generateId,
  formatDate,
  NutritionInfo,
  DEFAULT_STORAGE_LOCATIONS,
} from "@/lib/storage";
import { StorageLocation } from "@/lib/shelf-life-data";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type FoodSource = "usda" | "openfoodfacts" | "local";

const SOURCE_LABELS: Record<FoodSource, string> = {
  usda: "USDA FoodData Central",
  openfoodfacts: "OpenFoodFacts",
  local: "Custom Entry",
};

const SOURCE_BADGE_COLORS: Record<FoodSource, { bg: string; text: string }> = {
  usda: { bg: "rgba(52, 152, 219, 0.15)", text: "#3498DB" },
  openfoodfacts: { bg: "rgba(39, 174, 96, 0.15)", text: "#27AE60" },
  local: { bg: "rgba(108, 117, 125, 0.15)", text: "#6C757D" },
};

const RECENT_FOODS_KEY = "@recent_foods";

interface StorageLocationOption {
  key: string;
  label: string;
  icon: string;
}

const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Seafood",
  "Bakery",
  "Frozen",
  "Canned",
  "Beverages",
  "Snacks",
  "Condiments",
  "Grains",
  "Legumes",
  "Pantry Staples",
];

const CATEGORY_TO_SHELF_LIFE_MAP: Record<string, string> = {
  Produce: "vegetables",
  Dairy: "milk",
  Meat: "beef",
  Seafood: "seafood",
  Bakery: "bread",
  Frozen: "frozen foods",
  Canned: "canned goods",
  Beverages: "beverages",
  Snacks: "snacks",
  Condiments: "condiments",
  Grains: "grains",
  Legumes: "grains",
  "Pantry Staples": "pantry",
};

function getConfidenceColor(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return AppColors.confidenceHigh;
    case "medium":
      return AppColors.confidenceMedium;
    case "low":
      return AppColors.confidenceLow;
    default:
      return AppColors.textSecondary;
  }
}

function getConfidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence - estimate only";
    default:
      return "Unknown confidence";
  }
}

function getConfidenceIcon(
  confidence: ConfidenceLevel,
): keyof typeof Feather.glyphMap {
  switch (confidence) {
    case "high":
      return "check-circle";
    case "medium":
      return "alert-circle";
    case "low":
      return "alert-triangle";
    default:
      return "info";
  }
}

export default function AddItemScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "AddItem">>();
  const menuItems: MenuItemConfig[] = [];

  const today = new Date().toISOString().split("T")[0];
  const defaultExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const usdaFood = route.params?.usdaFood;
  const identifiedFood = route.params?.identifiedFoods?.[0];

  const [storageLocations, setStorageLocations] = useState<StorageLocationOption[]>([...DEFAULT_STORAGE_LOCATIONS]);

  const mapStorageLocationFromAI = (loc: string): string => {
    const locationMap: Record<string, string> = {
      refrigerator: "fridge",
      fridge: "fridge",
      freezer: "freezer",
      pantry: "pantry",
      counter: "counter",
    };
    return locationMap[loc?.toLowerCase()] || loc?.toLowerCase() || "fridge";
  };

  const getInitialCategory = () => {
    if (usdaFood?.category) return usdaFood.category;
    if (identifiedFood?.category) {
      const cat =
        identifiedFood.category.charAt(0).toUpperCase() +
        identifiedFood.category.slice(1);
      return CATEGORIES.includes(cat) ? cat : "Produce";
    }
    return "Produce";
  };

  const getInitialExpiration = () => {
    if (identifiedFood?.shelfLifeDays) {
      return new Date(
        Date.now() + identifiedFood.shelfLifeDays * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];
    }
    return defaultExpiration;
  };

  const [selectedFood, setSelectedFood] = useState(
    usdaFood ||
      (identifiedFood
        ? ({ description: identifiedFood.name } as any)
        : undefined),
  );
  const [name, setName] = useState(
    usdaFood?.description ||
      identifiedFood?.name ||
      route.params?.productName ||
      "",
  );
  const [barcode, setBarcode] = useState(route.params?.barcode || "");
  const [quantity, setQuantity] = useState(
    usdaFood
      ? String(usdaFood.servingSize)
      : identifiedFood
        ? String(identifiedFood.quantity)
        : "1",
  );
  const [unit, setUnit] = useState(
    usdaFood?.servingSizeUnit || identifiedFood?.quantityUnit || "pcs",
  );
  const [category, setCategory] = useState(getInitialCategory());
  const [storageLocation, setStorageLocation] = useState<string>(
    identifiedFood
      ? mapStorageLocationFromAI(identifiedFood.storageLocation)
      : "fridge",
  );
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [expirationDate, setExpirationDate] = useState(getInitialExpiration());
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    "purchase" | "expiration"
  >("expiration");
  const [saving, setSaving] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [foodSource, setFoodSource] = useState<FoodSource>("local");
  const [sourceId, setSourceId] = useState<string>("");
  const [isManualEntry, setIsManualEntry] = useState(false);

  const [userOverrodeDate, setUserOverrodeDate] = useState(false);
  const [showSuggestionNotes, setShowSuggestionNotes] = useState(false);
  const [suggestionAccepted, setSuggestionAccepted] = useState(false);
  const [userOverrodeStorage, setUserOverrodeStorage] = useState(false);

  const suggestionOpacity = useRef(new RNAnimated.Value(1)).current;

  const shelfLifeCategory =
    CATEGORY_TO_SHELF_LIFE_MAP[category] || category.toLowerCase();
  const storageSuggestion = useStorageSuggestion(category, name);
  const { recordChoice } = useStorageRecorder();
  const {
    suggestion,
    isLoading: isSuggestionLoading,
    isFromAI,
  } = useShelfLifeSuggestion({
    category: shelfLifeCategory,
    storageLocation,
    foodName: name,
  });

  const STORAGE_PREFS_KEY = "@storage_preferences";

  useEffect(() => {
    const loadStorageLocations = async () => {
      try {
        const allLocations = await storage.getAllStorageLocations();
        setStorageLocations(allLocations);
      } catch (e) {
        console.log("Error loading storage locations:", e);
      }
    };
    loadStorageLocations();
  }, []);

  useEffect(() => {
    const loadStoragePreference = async () => {
      try {
        const prefsJson = await AsyncStorage.getItem(STORAGE_PREFS_KEY);
        if (prefsJson) {
          const prefs = JSON.parse(prefsJson);
          const savedPref = prefs[category];
          if (savedPref) {
            setStorageLocation(savedPref);
            setUserOverrodeStorage(true);
            return;
          }
        }
      } catch (e) {
        console.log("Error loading storage preferences:", e);
      }

      if (storageSuggestion && !userOverrodeStorage) {
        const suggestedLoc =
          storageSuggestion.primary === "refrigerator"
            ? "fridge"
            : storageSuggestion.primary;
        const validKeys = storageLocations.map(loc => loc.key);
        if (validKeys.includes(suggestedLoc)) {
          setStorageLocation(suggestedLoc);
        }
      }
    };

    loadStoragePreference();
  }, [category, storageSuggestion, storageLocations]);

  const saveStoragePreference = async (cat: string, loc: string) => {
    try {
      const prefsJson = await AsyncStorage.getItem(STORAGE_PREFS_KEY);
      const prefs = prefsJson ? JSON.parse(prefsJson) : {};
      prefs[cat] = loc;
      await AsyncStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.log("Error saving storage preference:", e);
    }
  };

  const hasSelectedFood = !!selectedFood;

  const saveToRecentFoods = useCallback(async (item: SearchFoodItem) => {
    try {
      const recentJson = await AsyncStorage.getItem(RECENT_FOODS_KEY);
      let recent: SearchFoodItem[] = recentJson ? JSON.parse(recentJson) : [];
      recent = recent.filter((r) => r.id !== item.id);
      recent.unshift(item);
      recent = recent.slice(0, 10);
      await AsyncStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(recent));
    } catch (e) {
      console.log("Error saving recent food:", e);
    }
  }, []);

  const handleFoodSelect = useCallback(
    (item: SearchFoodItem) => {
      const isCustom = item.source === "local" && item.dataCompleteness === 0;

      setSelectedFood({
        fdcId: Number(item.sourceId) || 0,
        description: item.name,
        brandOwner: item.brand || null,
        servingSize: parseInt(item.nutrition.servingSize || "100") || 100,
        servingSizeUnit: "g",
        dataType: item.source === "usda" ? "Foundation" : "Branded",
        nutrition: {
          calories: item.nutrition.calories,
          protein: item.nutrition.protein,
          carbs: item.nutrition.carbs,
          fat: item.nutrition.fat,
          fiber: item.nutrition.fiber ?? 0,
          sugar: item.nutrition.sugar ?? 0,
        },
        category: item.category,
        usdaCategory: item.usdaCategory,
      });
      setName(item.name);
      setCategory(item.usdaCategory || item.category || "Pantry Staples");
      setQuantity("1");
      setUnit(item.nutrition.servingSize || "pcs");
      setFoodSource(item.source);
      setSourceId(item.sourceId);
      setIsManualEntry(isCustom);
      setUserOverrodeDate(false);
      setUserOverrodeStorage(false);

      if (!isCustom) {
        saveToRecentFoods(item);
      }
    },
    [saveToRecentFoods],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedFood(undefined);
    setName("");
    setCategory("Produce");
    setQuantity("1");
    setUnit("pcs");
    setFoodSource("local");
    setSourceId("");
    setIsManualEntry(false);
  }, []);

  useEffect(() => {
    if (suggestion && !userOverrodeDate) {
      RNAnimated.sequence([
        RNAnimated.timing(suggestionOpacity, {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: true,
        }),
        RNAnimated.timing(suggestionOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const newDate = suggestion.suggestedDate.toISOString().split("T")[0];
      setExpirationDate(newDate);
      setSuggestionAccepted(true);
    }
  }, [
    suggestion?.suggestedDays,
    suggestion?.confidence,
    storageLocation,
    category,
  ]);

  useEffect(() => {
    if (usdaFood && usdaFood.fdcId !== selectedFood?.fdcId) {
      setSelectedFood(usdaFood);
      setName(usdaFood.description || "");
      setQuantity(String(usdaFood.servingSize || 1));
      setUnit(usdaFood.servingSizeUnit || "pcs");
      setCategory(usdaFood.category || "Produce");
      setUserOverrodeDate(false);
    }
  }, [usdaFood]);

  useEffect(() => {
    const lookupBarcode = async () => {
      if (!barcode || selectedFood) return;

      setBarcodeLoading(true);
      setBarcodeError(null);

      try {
        const apiUrl = getApiUrl();
        const url = new URL(
          `/api/food/barcode/${encodeURIComponent(barcode)}`,
          apiUrl,
        );
        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error("Failed to lookup barcode");
        }

        const data = await response.json();

        if (data.product) {
          const product = data.product;
          const item: SearchFoodItem = {
            id: `barcode-${product.barcode}`,
            name: product.name,
            normalizedName: product.name.toLowerCase(),
            category: product.category || "Other",
            usdaCategory: product.usdaCategory || undefined,
            brand: product.brand || undefined,
            imageUrl: product.imageUrl || undefined,
            nutrition: {
              calories: product.nutrition?.calories || 0,
              protein: product.nutrition?.protein || 0,
              carbs: product.nutrition?.carbs || 0,
              fat: product.nutrition?.fat || 0,
              fiber: product.nutrition?.fiber,
              sugar: product.nutrition?.sugar,
              servingSize: product.servingSize
                ? `${product.servingSize}`
                : undefined,
            },
            source: product.source || "openfoodfacts",
            sourceId: product.barcode,
            relevanceScore: 100,
            dataCompleteness: 100,
          };
          handleFoodSelect(item);
        } else {
          setBarcodeError("Product not found. Try searching by name instead.");
        }
      } catch (error) {
        console.error("Barcode lookup error:", error);
        setBarcodeError(
          "Could not look up product. Try searching by name instead.",
        );
      } finally {
        setBarcodeLoading(false);
      }
    };

    lookupBarcode();
  }, [barcode, handleFoodSelect]);

  const nutrition: NutritionInfo | undefined = selectedFood
    ? {
        calories: selectedFood.nutrition.calories,
        protein: selectedFood.nutrition.protein,
        carbs: selectedFood.nutrition.carbs,
        fat: selectedFood.nutrition.fat,
        fiber: selectedFood.nutrition.fiber,
        sugar: selectedFood.nutrition.sugar,
      }
    : undefined;

  const handleSave = async () => {
    if (!hasSelectedFood) {
      Alert.alert(
        "Select a Food",
        "Please search and select a food item from the USDA database.",
      );
      return;
    }

    if (!name.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    if (!expirationDate) {
      Alert.alert(
        "No Expiration Date",
        "You haven't set an expiration date. Would you like to continue without one?",
        [
          { text: "Set Date", style: "cancel" },
          { text: "Continue", onPress: () => saveItem() },
        ],
      );
      return;
    }

    await saveItem();
  };

  const saveItem = async () => {
    setSaving(true);

    try {
      const newItem: FoodItem = {
        id: generateId(),
        name: name.trim(),
        barcode: barcode || undefined,
        quantity: parseInt(quantity) || 1,
        unit: unit || "pcs",
        storageLocation,
        purchaseDate,
        expirationDate: expirationDate || defaultExpiration,
        category,
        usdaCategory: selectedFood?.usdaCategory,
        notes: notes || undefined,
        nutrition,
        fdcId: selectedFood?.fdcId,
      };

      const suggestedLoc =
        storageSuggestion?.originalSuggestion ||
        (storageSuggestion?.primary === "refrigerator"
          ? "fridge"
          : storageSuggestion?.primary) ||
        "pantry";
      await recordChoice(category, storageLocation, suggestedLoc, name);

      await storage.addInventoryItem(newItem);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0];
      if (datePickerField === "expiration") {
        const suggestionDateString = suggestion?.suggestedDate
          .toISOString()
          .split("T")[0];
        if (dateString !== suggestionDateString) {
          setUserOverrodeDate(true);
          setSuggestionAccepted(false);
        }
        setExpirationDate(dateString);
      } else {
        setPurchaseDate(dateString);
      }
    }
  };

  const handleDatePickerDone = () => {
    setShowDatePicker(false);
  };

  const openDatePicker = (field: "purchase" | "expiration") => {
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setUserOverrodeDate(false);
    setUserOverrodeStorage(false);
  };

  const handleStorageChange = (newStorage: StorageLocation) => {
    setStorageLocation(newStorage);
    setUserOverrodeDate(false);

    if (storageSuggestion) {
      const suggestedLoc =
        storageSuggestion.primary === "refrigerator"
          ? "fridge"
          : storageSuggestion.primary;
      if (newStorage !== suggestedLoc) {
        setUserOverrodeStorage(true);
        saveStoragePreference(category, newStorage);
      } else {
        setUserOverrodeStorage(false);
      }
    }
  };

  const handleStorageSuggestionSelect = (location: string) => {
    const loc = location === "refrigerator" ? "fridge" : location;
    if (["fridge", "freezer", "pantry", "counter"].includes(loc)) {
      handleStorageChange(loc as StorageLocation);
    }
  };

  const handleUseSuggestion = () => {
    if (suggestion) {
      const newDate = suggestion.suggestedDate.toISOString().split("T")[0];
      setExpirationDate(newDate);
      setUserOverrodeDate(false);
      setSuggestionAccepted(true);
    }
  };

  const handleScanBarcode = () => {
    navigation.navigate("BarcodeScanner");
  };

  const handleScanWithAI = () => {
    navigation.navigate("FoodCamera");
  };

  const handleSearchFood = () => {
    navigation.navigate("FoodSearch");
  };

  const renderSuggestionHelper = () => {
    if (isSuggestionLoading) {
      return (
        <View
          style={styles.suggestionContainer}
          accessibilityRole="alert"
          accessibilityLabel="Loading shelf life suggestion"
          accessibilityLiveRegion="polite"
        >
          <View style={styles.suggestionIconRow}>
            <ActivityIndicator size="small" color={AppColors.primary} />
            <ThemedText
              type="caption"
              style={[styles.suggestionText, { color: theme.textSecondary }]}
            >
              Getting shelf life suggestion...
            </ThemedText>
          </View>
        </View>
      );
    }

    if (!suggestion) return null;

    const confidenceColor = getConfidenceColor(suggestion.confidence);
    const confidenceIcon = getConfidenceIcon(suggestion.confidence);
    const confidenceLabel = getConfidenceLabel(suggestion.confidence);
    const suggestionAnnouncement = `${confidenceLabel}. Suggested expiration: ${suggestion.suggestedDays} days for ${shelfLifeCategory} stored in ${storageLocation}${isFromAI ? ". AI powered suggestion" : ""}`;

    return (
      <RNAnimated.View
        style={[styles.suggestionContainer, { opacity: suggestionOpacity }]}
        accessibilityRole="alert"
        accessibilityLabel={
          userOverrodeDate
            ? `You set a custom expiration date. Original suggestion was ${suggestion.suggestedDays} days`
            : suggestionAnnouncement
        }
        accessibilityLiveRegion="polite"
      >
        <View style={styles.suggestionHeader}>
          <View
            style={styles.suggestionIconRow}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={confidenceLabel}
          >
            <Feather
              name={confidenceIcon}
              size={16}
              color={confidenceColor}
              accessibilityElementsHidden={true}
            />
            {!userOverrodeDate ? (
              <View style={styles.suggestionTextRow}>
                <ThemedText
                  type="caption"
                  style={[styles.suggestionText, { color: confidenceColor }]}
                >
                  Suggested: {suggestion.suggestedDays} days based on{" "}
                  {shelfLifeCategory} in {storageLocation}
                </ThemedText>
                {isFromAI ? (
                  <View
                    style={[
                      styles.aiBadge,
                      { backgroundColor: AppColors.secondary + "20" },
                    ]}
                    accessibilityLabel="AI powered suggestion"
                  >
                    <Feather name="zap" size={10} color={AppColors.secondary} />
                    <ThemedText
                      type="caption"
                      style={{
                        color: AppColors.secondary,
                        marginLeft: 2,
                        fontSize: 10,
                      }}
                    >
                      AI
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : (
              <ThemedText
                type="caption"
                style={[styles.suggestionText, { color: theme.textSecondary }]}
              >
                You set a custom date (suggestion was {suggestion.suggestedDays}{" "}
                days)
              </ThemedText>
            )}
          </View>

          <View style={styles.suggestionActions}>
            {suggestion.notes ? (
              <Pressable
                onPress={() => setShowSuggestionNotes(!showSuggestionNotes)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={
                  showSuggestionNotes
                    ? "Hide storage notes"
                    : "Show storage notes"
                }
                accessibilityHint="Double tap to toggle storage notes visibility"
              >
                <Feather name="info" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}

            {userOverrodeDate ? (
              <Pressable
                onPress={handleUseSuggestion}
                style={[
                  styles.useSuggestionButton,
                  { borderColor: AppColors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Reset to suggestion"
                accessibilityHint={`Double tap to set expiration date to ${suggestion.suggestedDays} days from today`}
              >
                <ThemedText type="caption" style={{ color: AppColors.primary }}>
                  Use Suggestion
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        {suggestion.confidence === "low" && !isFromAI ? (
          <ThemedText
            type="caption"
            style={[
              styles.lowConfidenceText,
              { color: AppColors.confidenceLow },
            ]}
            accessibilityRole="alert"
          >
            Estimate - please verify
          </ThemedText>
        ) : null}

        {suggestion.signsOfSpoilage ? (
          <View
            style={[
              styles.spoilageContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            accessibilityRole="alert"
            accessibilityLabel={`Signs of spoilage to watch for: ${suggestion.signsOfSpoilage}`}
          >
            <Feather name="alert-circle" size={12} color={AppColors.warning} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginLeft: 4, flex: 1 }}
            >
              Watch for: {suggestion.signsOfSpoilage}
            </ThemedText>
          </View>
        ) : null}

        {showSuggestionNotes && suggestion.notes ? (
          <View
            style={[
              styles.notesContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`Storage notes: ${suggestion.notes}`}
          >
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {suggestion.notes}
            </ThemedText>
          </View>
        ) : null}
      </RNAnimated.View>
    );
  };

  const renderNoDateReminder = () => {
    if (expirationDate) return null;

    return (
      <View style={styles.reminderContainer}>
        <Feather name="clock" size={14} color={AppColors.warning} />
        <ThemedText type="caption" style={{ color: AppColors.warning }}>
          Setting an expiration date helps track freshness
        </ThemedText>
      </View>
    );
  };

  if (!hasSelectedFood) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <ExpoGlassHeader
          title="Add Item"
          screenKey="addItem"
          showSearch={false}
          menuItems={menuItems}
        />
        <KeyboardAwareScrollViewCompat
          style={[styles.container, { backgroundColor: "transparent" }]}
          contentContainerStyle={[
            styles.selectFoodContainer,
            {
              paddingTop: 56 + insets.top + Spacing.lg,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
        {barcodeLoading ? (
          <View style={styles.selectFoodContent}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <ThemedText type="h3" style={styles.selectFoodTitle}>
              Looking Up Product...
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              Searching for barcode {barcode}
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.searchHeader}>
              <Feather name="plus-circle" size={32} color={AppColors.primary} />
              <ThemedText type="h3" style={styles.selectFoodTitle}>
                Add Food Item
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                Search from USDA and OpenFoodFacts databases for accurate
                nutrition data
              </ThemedText>
            </View>

            {barcodeError ? (
              <View style={styles.barcodeErrorContainer}>
                <Feather
                  name="alert-circle"
                  size={16}
                  color={AppColors.warning}
                />
                <ThemedText
                  type="caption"
                  style={{ color: AppColors.warning, marginLeft: Spacing.xs }}
                >
                  {barcodeError}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.searchSection}>
              <FoodSearchAutocomplete
                onSelect={handleFoodSelect}
                placeholder="Search for a food item..."
              />
            </View>

            <View style={styles.orDivider}>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
              <ThemedText
                type="caption"
                style={{
                  color: theme.textSecondary,
                  paddingHorizontal: Spacing.md,
                }}
              >
                or
              </ThemedText>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
            </View>

            <View style={styles.scanButtonRow}>
              <GlassButton
                variant="outline"
                onPress={handleScanBarcode}
                icon={
                  <Feather
                    name="maximize"
                    size={20}
                    color={AppColors.primary}
                  />
                }
                style={styles.scanButton}
              >
                Scan Barcode
              </GlassButton>
              <GlassButton
                variant="outline"
                onPress={handleScanWithAI}
                icon={
                  <Feather
                    name="camera"
                    size={20}
                    color={AppColors.secondary}
                  />
                }
                style={[
                  styles.scanButton,
                  { borderColor: AppColors.secondary },
                ]}
              >
                AI Photo Scan
              </GlassButton>
            </View>
          </>
        )}
        </KeyboardAwareScrollViewCompat>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ExpoGlassHeader
        title="Add Item"
        screenKey="addItem"
        showSearch={false}
        menuItems={menuItems}
      />
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
      <GlassCard style={styles.section}>
        <View style={styles.sectionHeaderWithAction}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Basic Info
          </ThemedText>
          <Pressable onPress={handleClearSelection} style={styles.changePill}>
            <ThemedText type="caption" style={{ color: AppColors.primary }}>
              Change
            </ThemedText>
          </Pressable>
        </View>

        <View
          style={[
            styles.sourceBadge,
            { backgroundColor: SOURCE_BADGE_COLORS[foodSource].bg },
          ]}
        >
          <ThemedText
            type="caption"
            style={{ color: SOURCE_BADGE_COLORS[foodSource].text }}
          >
            Data from {SOURCE_LABELS[foodSource]}
          </ThemedText>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>
            Name
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.glass.backgroundSubtle,
                color: theme.text,
                borderColor: theme.glass.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {barcode ? (
          <View style={styles.barcodeContainer}>
            <Feather name="tag" size={16} color={theme.textSecondary} />
            <ThemedText type="caption" style={styles.barcodeText}>
              Barcode: {barcode}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="small" style={styles.label}>
              Quantity
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.glass.backgroundSubtle,
                  color: theme.text,
                  borderColor: theme.glass.border,
                },
              ]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="small" style={styles.label}>
              Unit
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.glass.backgroundSubtle,
                  color: theme.text,
                  borderColor: theme.glass.border,
                },
              ]}
              value={unit}
              onChangeText={setUnit}
              placeholder="pcs"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <ThemedText type="small" style={styles.label}>
              Category
            </ThemedText>
            <View
              style={[
                styles.readOnlyField,
                {
                  backgroundColor: theme.glass.backgroundSubtle,
                  borderColor: theme.glass.border,
                },
              ]}
            >
              <ThemedText
                type="body"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                {selectedFood?.usdaCategory || category || "Not specified"}
              </ThemedText>
            </View>
          </View>
        </View>
      </GlassCard>

      {nutrition ? (
        <NutritionSection
          foodId={sourceId || generateId()}
          foodName={name}
          defaultQuantity={parseInt(quantity) || 1}
          nutrition={nutrition}
        />
      ) : null}

      <GlassCard style={styles.section}>
        <StorageSuggestionBadge
          suggestedLocation={storageSuggestion?.primary || "refrigerator"}
          alternatives={storageSuggestion?.alternatives || []}
          onSelect={handleStorageSuggestionSelect}
          selectedLocation={
            storageLocation === "fridge" ? "refrigerator" : storageLocation
          }
          confidence={storageSuggestion?.confidence}
          shelfLifeDays={suggestion?.suggestedDays}
        />
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Dates
        </ThemedText>

        <View style={styles.row}>
          <Pressable
            style={[
              styles.dateButtonCompact,
              {
                backgroundColor: theme.glass.backgroundSubtle,
                borderColor: theme.glass.border,
                flex: 1,
              },
            ]}
            onPress={() => openDatePicker("purchase")}
          >
            <ThemedText type="small" style={styles.label}>
              Purchase
            </ThemedText>
            <View style={styles.dateValueRow}>
              <ThemedText type="body" numberOfLines={1}>
                {formatDate(purchaseDate)}
              </ThemedText>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.dateButtonCompact,
              {
                backgroundColor: theme.glass.backgroundSubtle,
                borderColor: theme.glass.border,
                flex: 1,
              },
            ]}
            onPress={() => openDatePicker("expiration")}
          >
            <View style={styles.dateLabelRow}>
              <ThemedText type="small" style={styles.label}>
                Expiration
              </ThemedText>
              {suggestion && !userOverrodeDate ? (
                <View
                  style={[
                    styles.suggestionBadgeSmall,
                    {
                      backgroundColor:
                        getConfidenceColor(suggestion.confidence) + "20",
                    },
                  ]}
                >
                  <Feather
                    name={getConfidenceIcon(suggestion.confidence)}
                    size={10}
                    color={getConfidenceColor(suggestion.confidence)}
                  />
                </View>
              ) : null}
            </View>
            <View style={styles.dateValueRow}>
              <ThemedText type="body" numberOfLines={1}>
                {expirationDate ? formatDate(expirationDate) : "Not set"}
              </ThemedText>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
            </View>
          </Pressable>
        </View>

        {renderSuggestionHelper()}
        {renderNoDateReminder()}
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Notes
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.glass.backgroundSubtle,
              color: theme.text,
              borderColor: theme.glass.border,
            },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
        />
      </GlassCard>

      {Platform.OS === "ios" ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={handleDatePickerDone}
        >
          <Pressable
            style={styles.datePickerOverlay}
            onPress={handleDatePickerDone}
          >
            <Pressable
              style={[
                styles.datePickerContainer,
                { backgroundColor: theme.backgroundDefault },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.datePickerHeader}>
                <ThemedText type="h4">
                  {datePickerField === "expiration"
                    ? "Expiration Date"
                    : "Purchase Date"}
                </ThemedText>
                <Pressable onPress={handleDatePickerDone}>
                  <ThemedText
                    style={{ color: AppColors.primary, fontWeight: "600" }}
                  >
                    Done
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={
                  new Date(
                    datePickerField === "expiration"
                      ? expirationDate || today
                      : purchaseDate,
                  )
                }
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.datePicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : showDatePicker ? (
        <DateTimePicker
          value={
            new Date(
              datePickerField === "expiration"
                ? expirationDate || today
                : purchaseDate,
            )
          }
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  selectFoodContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  selectFoodContent: {
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  selectFoodTitle: {
    marginTop: Spacing.lg,
  },
  barcodeErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
  },
  selectFoodButtons: {
    gap: Spacing.md,
  },
  actionButton: {
    width: "100%",
  },
  selectedFoodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedFoodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  changeButton: {
    padding: Spacing.sm,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  changePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    opacity: 0.7,
  },
  input: {
    height: 48,
    borderRadius: GlassEffect.borderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  barcodeText: {
    fontFamily: "monospace",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
  },
  locationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  locationCard: {
    width: "48%",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: 1,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: 1,
  },
  dateButtonCompact: {
    padding: Spacing.sm,
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  dateValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateContent: {
    flex: 1,
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  suggestionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  suggestionBadgeSmall: {
    padding: 2,
    borderRadius: BorderRadius.full,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  nutritionItem: {
    alignItems: "center",
  },
  suggestionContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  suggestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  suggestionIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  suggestionText: {
    flex: 1,
    flexWrap: "wrap",
  },
  suggestionTextRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  suggestionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginLeft: Spacing.sm,
  },
  useSuggestionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  lowConfidenceText: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xl,
  },
  spoilageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  notesContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  reminderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  storageSuggestionContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  confidenceNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  suggestedIndicator: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  searchHeader: {
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  searchSection: {
    zIndex: 100,
    marginBottom: Spacing.lg,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  scanButtonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  scanButton: {
    flex: 1,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  datePicker: {
    height: 200,
  },
  readOnlyField: {
    height: 48,
    borderRadius: GlassEffect.borderRadius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
    borderWidth: 1,
  },
});
