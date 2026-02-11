import React, { useState, useEffect, useRef } from "react";
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
import { logger } from "@/lib/logger";
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
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { StorageSuggestionBadge } from "@/components/StorageSuggestionBadge";
import { NutritionSection } from "@/components/NutritionSection";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
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
  const { checkLimit, entitlements } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const menuItems: MenuItemConfig[] = [];

  const today = new Date().toISOString().split("T")[0];
  const defaultExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const identifiedFood = route.params?.identifiedFoods?.[0];
  const scannedNutrition = route.params?.scannedNutrition;

  const [storageLocations, setStorageLocations] = useState<
    StorageLocationOption[]
  >([...DEFAULT_STORAGE_LOCATIONS]);

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

  const [name, setName] = useState(
    identifiedFood?.name ||
      route.params?.productName ||
      "",
  );
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState(route.params?.barcode || "");
  const [quantity, setQuantity] = useState(
    identifiedFood
      ? String(identifiedFood.quantity)
      : "1",
  );
  const [unit, setUnit] = useState(
    identifiedFood?.quantityUnit || "pcs",
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

  const [userOverrodeDate, setUserOverrodeDate] = useState(false);
  const [showSuggestionNotes, setShowSuggestionNotes] = useState(false);
  const [_suggestionAccepted, setSuggestionAccepted] = useState(false);
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
        logger.log("Error loading storage locations:", e);
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
        logger.log("Error loading storage preferences:", e);
      }

      if (storageSuggestion && !userOverrodeStorage) {
        const suggestedLoc =
          storageSuggestion.primary === "refrigerator"
            ? "fridge"
            : storageSuggestion.primary;
        const validKeys = storageLocations.map((loc) => loc.key);
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
      logger.log("Error saving storage preference:", e);
    }
  };

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

  const nutrition: NutritionInfo | undefined = scannedNutrition
    ? {
        calories: scannedNutrition.calories || 0,
        protein: scannedNutrition.protein || 0,
        carbs: scannedNutrition.carbs || 0,
        fat: scannedNutrition.fat || 0,
        fiber: scannedNutrition.fiber,
        sugar: scannedNutrition.sugar,
        servingSize: scannedNutrition.servingSize,
      }
    : undefined;

  const hasNutrition =
    nutrition && (nutrition.calories > 0 || nutrition.protein > 0);

  const handleScanNutritionLabel = () => {
    navigation.navigate("IngredientScanner", {
      mode: "nutrition",
      returnTo: "AddItem",
      existingBarcode: barcode,
      existingProductName: name,
    });
  };

  const handleSaveAndScanNext = async () => {
    const pantryLimit = checkLimit("pantryItems");
    if (!pantryLimit.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    if (!name.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    setSaving(true);
    try {
      const newItem: FoodItem = {
        id: generateId(),
        name: name.trim(),
        brand: brand.trim() || undefined,
        barcode: barcode || undefined,
        quantity: parseInt(quantity) || 1,
        unit: unit || "pcs",
        storageLocation,
        purchaseDate,
        expirationDate: expirationDate || defaultExpiration,
        category,
        notes: notes || undefined,
        nutrition,
      };

      await storage.addInventoryItem(newItem);

      navigation.replace("IngredientScanner", { mode: "barcode" });
    } catch (error) {
      logger.error("Error saving item:", error);
      Alert.alert("Error", "Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
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
    const pantryLimit = checkLimit("pantryItems");
    if (!pantryLimit.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    setSaving(true);

    try {
      const newItem: FoodItem = {
        id: generateId(),
        name: name.trim(),
        brand: brand.trim() || undefined,
        barcode: barcode || undefined,
        quantity: parseInt(quantity) || 1,
        unit: unit || "pcs",
        storageLocation,
        purchaseDate,
        expirationDate: expirationDate || defaultExpiration,
        category,
        notes: notes || undefined,
        nutrition,
      };

      const suggestedLoc =
        storageSuggestion?.originalSuggestion ||
        (storageSuggestion?.primary === "refrigerator"
          ? "fridge"
          : storageSuggestion?.primary) ||
        "pantry";
      await recordChoice(category, storageLocation, suggestedLoc, name);

      await storage.addInventoryItem(newItem);

      try {
        const Haptics = await import("expo-haptics");
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ExpoGlassHeader
        title="Add Item"
        screenKey="addItem"
        showSearch={false}
        menuItems={menuItems}
        showBackButton
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
            data-testid="button-scan-barcode"
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
            data-testid="button-ai-scan"
          >
            AI Photo Scan
          </GlassButton>
        </View>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Basic Info
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Name *
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
              data-testid="input-item-name"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Brand
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
              value={brand}
              onChangeText={setBrand}
              placeholder="Brand name (optional)"
              placeholderTextColor={theme.textSecondary}
              data-testid="input-item-brand"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              UPC / Barcode
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
              value={barcode}
              onChangeText={setBarcode}
              placeholder="UPC barcode (optional)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              data-testid="input-item-barcode"
            />
          </View>

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
                data-testid="input-item-quantity"
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
                data-testid="input-item-unit"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>
              Category
            </ThemedText>
            <View style={styles.chipContainer}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        category === cat
                          ? AppColors.primary + "20"
                          : theme.glass.backgroundSubtle,
                      borderColor:
                        category === cat
                          ? AppColors.primary
                          : theme.glass.border,
                    },
                  ]}
                  data-testid={`chip-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${cat}`}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color:
                        category === cat ? AppColors.primary : theme.text,
                    }}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </GlassCard>

        {hasNutrition ? (
          <NutritionSection
            foodId={generateId()}
            foodName={name}
            defaultQuantity={parseInt(quantity) || 1}
            nutrition={nutrition}
          />
        ) : barcode ? (
          <GlassCard style={styles.section}>
            <View style={styles.noNutritionContainer}>
              <Feather name="file-text" size={32} color={theme.textSecondary} />
              <ThemedText type="body" style={styles.noNutritionText}>
                No nutrition data available
              </ThemedText>
              <ThemedText type="caption" style={styles.noNutritionHint}>
                Scan the nutrition label on the packaging to add nutrition info
              </ThemedText>
              <View style={styles.nutritionActionButtons}>
                <GlassButton
                  onPress={handleScanNutritionLabel}
                  variant="outline"
                  style={styles.nutritionActionButton}
                >
                  <View style={styles.scanButtonContent}>
                    <Feather
                      name="camera"
                      size={18}
                      color={AppColors.primary}
                    />
                    <ThemedText
                      style={{
                        color: AppColors.primary,
                        marginLeft: Spacing.sm,
                      }}
                    >
                      Scan Label
                    </ThemedText>
                  </View>
                </GlassButton>
                <GlassButton
                  onPress={handleSaveAndScanNext}
                  variant="secondary"
                  style={styles.nutritionActionButton}
                >
                  <View style={styles.scanButtonContent}>
                    <Feather name="maximize" size={18} color={theme.text} />
                    <ThemedText style={{ marginLeft: Spacing.sm }}>
                      Scan Next
                    </ThemedText>
                  </View>
                </GlassButton>
              </View>
            </View>
          </GlassCard>
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
              accessibilityRole="button"
              accessibilityLabel="Select purchase date"
            >
              <ThemedText type="small" style={styles.label}>
                Purchase
              </ThemedText>
              <View style={styles.dateValueRow}>
                <ThemedText type="body" numberOfLines={1}>
                  {formatDate(purchaseDate)}
                </ThemedText>
                <Feather
                  name="calendar"
                  size={16}
                  color={theme.textSecondary}
                />
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
              accessibilityRole="button"
              accessibilityLabel="Select expiration date"
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
                <Feather
                  name="calendar"
                  size={16}
                  color={theme.textSecondary}
                />
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
              accessibilityRole="button"
              accessibilityLabel="Close date picker"
            >
              <Pressable
                style={[
                  styles.datePickerContainer,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={(e) => e.stopPropagation()}
                accessibilityRole="button"
                accessibilityLabel="Date picker content"
              >
                <View style={styles.datePickerHeader}>
                  <ThemedText type="h4">
                    {datePickerField === "expiration"
                      ? "Expiration Date"
                      : "Purchase Date"}
                  </ThemedText>
                  <Pressable onPress={handleDatePickerDone} accessibilityRole="button" accessibilityLabel="Done selecting date">
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

        <View style={styles.actionButtonsContainer}>
          <GlassButton
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            data-testid="button-cancel-add-item"
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !name.trim()}
            style={styles.saveButton}
            data-testid="button-save-item"
          >
            {saving ? "Saving..." : "Add Item"}
          </GlassButton>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={showUpgradePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradePrompt(false)}
        accessibilityViewIsModal={true}
        data-testid="modal-upgrade-pantry-limit"
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 24 }}>
          <UpgradePrompt
            type="limit"
            limitName="pantry items"
            remaining={0}
            max={typeof entitlements.maxPantryItems === "number" ? entitlements.maxPantryItems : 25}
            onUpgrade={() => {
              setShowUpgradePrompt(false);
              navigation.navigate("Main" as any, {
                screen: "Tabs",
                params: {
                  screen: "ProfileTab",
                  params: { screen: "Subscription" },
                },
              });
            }}
            onDismiss={() => setShowUpgradePrompt(false)}
          />
        </View>
      </Modal>
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
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
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
  scanButtonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  scanButton: {
    flex: 1,
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
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  suggestionBadgeSmall: {
    padding: 2,
    borderRadius: BorderRadius.full,
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
  actionButtonsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  noNutritionContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  noNutritionText: {
    textAlign: "center",
  },
  noNutritionHint: {
    textAlign: "center",
    opacity: 0.7,
  },
  scanButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  nutritionActionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  nutritionActionButton: {
    flex: 1,
  },
});
