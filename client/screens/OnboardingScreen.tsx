import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useNavigation, CommonActions } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, AppColors } from "@/constants/theme";
import { storage, FoodItem, generateId } from "@/lib/storage";
import { apiClient } from "@/lib/api-client";
import { useOnboardingStatus } from "@/contexts/OnboardingContext";
import { logger } from "@/lib/logger";

import {
  WelcomeStep,
  PreferencesStep,
  StorageStep,
  FoodsStep,
  CookwareStep,
  CompleteStep,
  STARTER_FOODS,
  Appliance,
  OnboardingStep,
} from "@/components/onboarding";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { markOnboardingComplete } = useOnboardingStatus();
  const { entitlements } = useSubscription();

  const isPro = entitlements.maxCookware === "unlimited";
  const cookwareLimit = typeof entitlements.maxCookware === "number" ? entitlements.maxCookware : Infinity;

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [stepLoaded, setStepLoaded] = useState(false);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(
    new Set(),
  );
  const [appliancesLoaded, setAppliancesLoaded] = useState(false);
  const [selectedFoodIds, setSelectedFoodIds] = useState<Set<string>>(
    new Set(STARTER_FOODS.map((f) => f.id)),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [servingSize, setServingSize] = useState(2);
  const [dailyMeals, setDailyMeals] = useState(3);
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(
    new Set(["american", "italian"]),
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<Set<string>>(
    new Set(["none"]),
  );
  const [selectedStorageAreas, setSelectedStorageAreas] = useState<Set<string>>(
    new Set(["fridge", "pantry"]),
  );

  useEffect(() => {
    if (!isPro) {
      setSelectedEquipmentIds((prev) => {
        if (prev.size <= cookwareLimit) return prev;
        const arr = Array.from(prev).slice(0, cookwareLimit);
        return new Set(arr);
      });
    }
  }, [isPro, cookwareLimit]);

  useEffect(() => {
    loadSavedStep();
  }, []);

  useEffect(() => {
    if (stepLoaded && step !== "welcome") {
      storage.saveOnboardingStep(step);
    }
  }, [step, stepLoaded]);

  useEffect(() => {
    if (step === "cookware" && !appliancesLoaded) {
      loadAppliances();
    }
  }, [step, appliancesLoaded]);

  const loadSavedStep = async () => {
    try {
      const savedStep = await storage.getOnboardingStep();
      if (
        savedStep &&
        [
          "welcome",
          "preferences",
          "storage",
          "foods",
          "cookware",
          "complete",
        ].includes(savedStep)
      ) {
        setStep(savedStep as OnboardingStep);
      }
    } catch (err) {
      logger.error("Error loading saved step:", err);
    } finally {
      setLoading(false);
      setStepLoaded(true);
    }
  };

  const loadAppliances = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Appliance[]>("/api/appliances");
      const commonItems = data.filter((a: Appliance) => a.isCommon);
      setAppliances(data);
      const itemsToSelect = commonItems.slice(0, cookwareLimit);
      const commonIds = new Set<number>(
        itemsToSelect.map((a: Appliance) => a.id),
      );
      setSelectedEquipmentIds(commonIds);
      setAppliancesLoaded(true);
    } catch (err) {
      logger.error("Error loading appliances:", err);
    } finally {
      setLoading(false);
    }
  };

  const equipmentSelectedCount = selectedEquipmentIds.size;
  const foodSelectedCount = selectedFoodIds.size;
  const isAtEquipmentLimit =
    !isPro && equipmentSelectedCount >= cookwareLimit;

  const toggleAppliance = useCallback(
    (id: number) => {
      setSelectedEquipmentIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          if (!isPro && newSet.size >= cookwareLimit) {
            return prev;
          }
          newSet.add(id);
        }
        return newSet;
      });
    },
    [isPro],
  );

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
        return new Set(["none"]);
      } else {
        newSet.delete("none");
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
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

  const handleWelcomeToPreferences = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStep("preferences");
  };

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

  const handleBackToWelcome = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStep("welcome");
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
      const currentPrefs = await storage.getPreferences();
      await storage.setPreferences({
        ...currentPrefs,
        servingSize,
        dailyMeals,
        cuisinePreferences: Array.from(selectedCuisines),
        dietaryRestrictions: Array.from(dietaryPreferences).filter(
          (d) => d !== "none",
        ),
        storageAreas: Array.from(selectedStorageAreas),
      });

      await storage.setCookware(Array.from(selectedEquipmentIds));

      const selectedFoods = STARTER_FOODS.filter((f) =>
        selectedFoodIds.has(f.id),
      );
      const today = new Date();

      const existingInventory = await storage.getInventory();
      const existingByFdcId = new Map(
        existingInventory
          .filter((item) => item.fdcId)
          .map((item) => [item.fdcId, item]),
      );
      const existingByName = new Map(
        existingInventory.map((item) => [item.name.toLowerCase(), item]),
      );

      const newItems: FoodItem[] = [];
      const updatedItems: FoodItem[] = [];

      for (const food of selectedFoods) {
        const existingByFdc = existingByFdcId.get(food.fdcId);
        const existingByNameItem = existingByName.get(food.name.toLowerCase());
        const existing = existingByFdc || existingByNameItem;

        if (existing) {
          updatedItems.push({
            ...existing,
            quantity: existing.quantity + food.defaultQuantity,
          });
        } else {
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

      for (const item of updatedItems) {
        await storage.updateInventoryItem(item, { skipSync: true });
      }

      if (newItems.length > 0) {
        await storage.addInventoryItems(newItems, { skipSync: true });
      }

      await storage.setOnboardingCompleted();
      await storage.clearOnboardingStep();
      markOnboardingComplete();

      const saveResult = await storage.syncToCloud();
      if (!saveResult.success) {
        logger.warn("Initial data save failed:", saveResult.error);
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
      logger.error("Error completing onboarding:", err);
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
          <ActivityIndicator size="large" />
          <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>Loading...</ThemedText>
        </View>
      </View>
    );
  }

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
      <AnimatedBackground />
      {step === "welcome" && (
        <WelcomeStep
          theme={theme}
          onNext={handleWelcomeToPreferences}
        />
      )}
      {step === "preferences" && (
        <PreferencesStep
          theme={theme}
          servingSize={servingSize}
          dailyMeals={dailyMeals}
          selectedCuisines={selectedCuisines}
          dietaryPreferences={dietaryPreferences}
          setServingSize={setServingSize}
          setDailyMeals={setDailyMeals}
          toggleCuisine={toggleCuisine}
          toggleDietaryPreference={toggleDietaryPreference}
          onNext={handlePreferencesToStorage}
          onBack={handleBackToWelcome}
        />
      )}
      {step === "storage" && (
        <StorageStep
          theme={theme}
          selectedStorageAreas={selectedStorageAreas}
          toggleStorageArea={toggleStorageArea}
          onNext={handleStorageToFoods}
          onBack={handleBackToPreferences}
        />
      )}
      {step === "foods" && (
        <FoodsStep
          theme={theme}
          selectedFoodIds={selectedFoodIds}
          foodSelectedCount={foodSelectedCount}
          toggleFood={toggleFood}
          selectAllFoods={selectAllFoods}
          deselectAllFoods={deselectAllFoods}
          onNext={handleFoodsToCookware}
          onBack={handleFoodsToPrev}
        />
      )}
      {step === "cookware" && (
        <CookwareStep
          theme={theme}
          appliances={appliances}
          selectedEquipmentIds={selectedEquipmentIds}
          setSelectedEquipmentIds={setSelectedEquipmentIds}
          equipmentSelectedCount={equipmentSelectedCount}
          isAtEquipmentLimit={isAtEquipmentLimit}
          isPro={isPro}
          cookwareLimit={cookwareLimit}
          toggleAppliance={toggleAppliance}
          saving={saving}
          onNext={handleCookwareToComplete}
          onBack={handleBackToFoods}
        />
      )}
      {step === "complete" && (
        <CompleteStep
          theme={theme}
          appliances={appliances}
          selectedEquipmentIds={selectedEquipmentIds}
          selectedFoodIds={selectedFoodIds}
          equipmentSelectedCount={equipmentSelectedCount}
          foodSelectedCount={foodSelectedCount}
          toggleAppliance={toggleAppliance}
          toggleFood={toggleFood}
          saving={saving}
          onBack={() => setStep("cookware")}
          onComplete={handleComplete}
        />
      )}
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
});
