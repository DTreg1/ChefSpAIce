/**
 * =============================================================================
 * SETTINGS SCREEN
 * =============================================================================
 * 
 * The user preferences and settings screen for ChefSpAIce.
 * Allows users to customize their app experience and manage their account.
 * 
 * KEY FEATURES:
 * - Cloud sync status indicator (for authenticated users)
 * - Notification preferences (expiration alerts, timing)
 * - Recipe display settings (cooking term highlighting)
 * - Meal planning preferences (number of meals per day)
 * - Cuisine preferences for recipe suggestions
 * - Allergy/dietary restrictions management
 * - Macro nutrient target adjustment
 * - Instacart integration settings
 * - Data management (clear data, reset preferences)
 * - Account deletion with confirmation flow
 * 
 * UI COMPONENTS:
 * - GlassCard sections for each settings group
 * - Toggles for boolean settings
 * - Chip selectors for multi-select options
 * - Stepper controls for numeric values (macro targets)
 * - Destructive action buttons with confirmation dialogs
 * 
 * DATA PERSISTENCE:
 * - Settings saved to local storage
 * - Synced with server for authenticated users
 * - Macros auto-balance to always equal 100%
 * 
 * @module screens/SettingsScreen
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Switch,
  Alert,
  Pressable,
  Platform,
} from "react-native";
import { reloadAppAsync } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  UserPreferences,
  DEFAULT_MACRO_TARGETS,
  MacroTargets,
  InstacartSettings,
} from "@/lib/storage";
import { MEAL_PLAN_PRESETS, DEFAULT_PRESET_ID } from "@/constants/meal-plan";

const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Asian",
  "Mediterranean",
  "American",
  "Indian",
  "French",
  "Japanese",
  "Thai",
  "Greek",
];

const COMMON_ALLERGIES = [
  "Gluten",
  "Dairy",
  "Nuts",
  "Eggs",
  "Shellfish",
  "Soy",
  "Fish",
  "Sesame",
];
import {
  clearPreferences,
  getLearnedPreferencesCount,
} from "@/lib/user-storage-preferences";
import {
  requestNotificationPermissions,
  scheduleExpirationNotifications,
  cancelAllExpirationNotifications,
} from "@/lib/notifications";

type DeleteConfirmationStep = "none" | "first" | "second";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [],
    cuisinePreferences: [],
    notificationsEnabled: true,
    expirationAlertDays: 3,
    termHighlightingEnabled: true,
    macroTargets: DEFAULT_MACRO_TARGETS,
  });
  const [learnedPrefsCount, setLearnedPrefsCount] = useState(0);
  const [deleteStep, setDeleteStep] = useState<DeleteConfirmationStep>("none");
  const [instacartSettings, setInstacartSettings] = useState<InstacartSettings>({
    isConnected: false,
    preferredStores: [],
    zipCode: undefined,
    apiKeyConfigured: false,
  });

  const loadData = useCallback(async () => {
    const [prefs, prefsCount, instacart] = await Promise.all([
      storage.getPreferences(),
      getLearnedPreferencesCount(),
      storage.getInstacartSettings(),
    ]);
    setPreferences(prefs);
    setLearnedPrefsCount(prefsCount);
    setInstacartSettings(instacart);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications in your device settings to receive expiration alerts.",
        );
        return;
      }
    }

    const newPrefs = { ...preferences, notificationsEnabled: value };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);

    if (value) {
      await scheduleExpirationNotifications();
    } else {
      await cancelAllExpirationNotifications();
    }
  };

  const handleExpirationDaysChange = async (days: number) => {
    const clampedDays = Math.max(1, Math.min(7, days));
    const newPrefs = { ...preferences, expirationAlertDays: clampedDays };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);

    if (preferences.notificationsEnabled) {
      await scheduleExpirationNotifications();
    }
  };

  const handleToggleTermHighlighting = async (value: boolean) => {
    const newPrefs = { ...preferences, termHighlightingEnabled: value };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleSelectMealPlanPreset = async (presetId: string) => {
    const newPrefs = { ...preferences, mealPlanPresetId: presetId };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleToggleCuisine = async (cuisine: string) => {
    const current = preferences.cuisinePreferences || [];
    const updated = current.includes(cuisine)
      ? current.filter((c) => c !== cuisine)
      : [...current, cuisine];
    const newPrefs = { ...preferences, cuisinePreferences: updated };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleToggleAllergy = async (allergy: string) => {
    const current = preferences.dietaryRestrictions || [];
    const updated = current.includes(allergy)
      ? current.filter((a) => a !== allergy)
      : [...current, allergy];
    const newPrefs = { ...preferences, dietaryRestrictions: updated };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleMacroChange = async (
    macro: keyof MacroTargets,
    delta: number,
  ) => {
    const currentMacros = preferences.macroTargets || DEFAULT_MACRO_TARGETS;
    const MIN_MACRO = 5;

    // Deterministic macro redistribution algorithm
    // Step 1: Calculate new value with bounds (min 5, max 90 to leave room for others)
    const maxAllowed = 100 - 2 * MIN_MACRO; // 90
    const requestedValue = currentMacros[macro] + delta;
    const newValue = Math.max(MIN_MACRO, Math.min(maxAllowed, requestedValue));

    // If no change possible, don't update
    if (newValue === currentMacros[macro]) {
      return;
    }

    // Step 2: Determine remaining percentage for other two macros
    const remaining = 100 - newValue;

    // Step 3: Get the other two macros in consistent order
    const allMacros: (keyof MacroTargets)[] = ["protein", "carbs", "fat"];
    const otherMacros = allMacros.filter((k) => k !== macro);
    const [first, second] = otherMacros;

    // Step 4: Distribute remaining proportionally, enforcing minimums
    const currentOtherTotal = currentMacros[first] + currentMacros[second];
    let firstValue: number;
    let secondValue: number;

    if (currentOtherTotal > 0) {
      // Proportional distribution based on current ratio
      const firstRatio = currentMacros[first] / currentOtherTotal;
      firstValue = Math.round(firstRatio * remaining);
    } else {
      // Equal split if both were somehow 0
      firstValue = Math.round(remaining / 2);
    }

    // Step 5: Clamp first value to valid range, assign remainder to second
    firstValue = Math.max(
      MIN_MACRO,
      Math.min(remaining - MIN_MACRO, firstValue),
    );
    secondValue = remaining - firstValue;

    // Step 6: Final safety check - if second is invalid, redistribute
    if (secondValue < MIN_MACRO) {
      secondValue = MIN_MACRO;
      firstValue = remaining - MIN_MACRO;
    }

    // Build final macros object
    let finalProtein =
      macro === "protein"
        ? newValue
        : first === "protein"
          ? firstValue
          : secondValue;
    let finalCarbs =
      macro === "carbs"
        ? newValue
        : first === "carbs"
          ? firstValue
          : secondValue;
    let finalFat =
      macro === "fat" ? newValue : first === "fat" ? firstValue : secondValue;

    // Final clamping pass - ensure all values are within bounds
    finalProtein = Math.max(MIN_MACRO, Math.min(maxAllowed, finalProtein));
    finalCarbs = Math.max(MIN_MACRO, Math.min(maxAllowed, finalCarbs));
    finalFat = Math.max(MIN_MACRO, Math.min(maxAllowed, finalFat));

    // Assign remainder to fat (as the last absorber) to ensure total = 100
    const currentTotal = finalProtein + finalCarbs + finalFat;
    if (currentTotal !== 100) {
      const diff = 100 - currentTotal;
      // Try to adjust fat first, otherwise adjust carbs
      if (finalFat + diff >= MIN_MACRO && finalFat + diff <= maxAllowed) {
        finalFat += diff;
      } else if (
        finalCarbs + diff >= MIN_MACRO &&
        finalCarbs + diff <= maxAllowed
      ) {
        finalCarbs += diff;
      } else {
        finalProtein += diff;
      }
    }

    const newMacros: MacroTargets = {
      protein: finalProtein,
      carbs: finalCarbs,
      fat: finalFat,
    };

    const newPrefs = { ...preferences, macroTargets: newMacros };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleResetMacros = async () => {
    const newPrefs = { ...preferences, macroTargets: DEFAULT_MACRO_TARGETS };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleClearData = async () => {
    const message =
      "This will permanently delete all your inventory items, recipes, meal plans, and chat history. This action cannot be undone.";

    if (Platform.OS === "web") {
      if (window.confirm(`Clear All Data?\n\n${message}`)) {
        await storage.clearAllData();
        await clearPreferences();
        setLearnedPrefsCount(0);
        window.alert("All your data has been deleted. The app will now reload.");
        window.location.reload();
      }
    } else {
      Alert.alert("Clear All Data", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await storage.clearAllData();
            await clearPreferences();
            setLearnedPrefsCount(0);
            Alert.alert("Data Cleared", "All your data has been deleted. The app will now reload.", [
              {
                text: "OK",
                onPress: () => reloadAppAsync(),
              },
            ]);
          },
        },
      ]);
    }
  };

  const handleResetStoragePreferences = async () => {
    const message =
      "This will reset all your learned storage location preferences. The app will go back to using default suggestions for where to store food items.";

    if (Platform.OS === "web") {
      if (window.confirm(`Reset Storage Preferences?\n\n${message}`)) {
        await clearPreferences();
        setLearnedPrefsCount(0);
        window.alert(
          "Storage location preferences have been reset to defaults.",
        );
      }
    } else {
      Alert.alert("Reset Storage Preferences", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearPreferences();
            setLearnedPrefsCount(0);
            Alert.alert(
              "Preferences Reset",
              "Storage location preferences have been reset to defaults.",
            );
          },
        },
      ]);
    }
  };

  const handleDeleteAccountStep1 = () => {
    const message = "Are you sure you want to delete your account? This action is irreversible and will permanently remove all your data.";

    if (Platform.OS === "web") {
      if (window.confirm(`Delete Account?\n\n${message}`)) {
        setDeleteStep("first");
      }
    } else {
      Alert.alert("Delete Account", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => setDeleteStep("first"),
        },
      ]);
    }
  };

  const handleDeleteAccountStep2 = async () => {
    const message = "This is your final warning. Deleting your account will permanently remove:\n\n- All inventory items\n- All saved recipes\n- Meal plans\n- Chat history\n- All preferences\n\nThis cannot be undone.";

    if (Platform.OS === "web") {
      if (window.confirm(`Final Confirmation\n\n${message}`)) {
        await storage.deleteAccount();
        window.alert("Your account has been deleted. The app will now restart.");
        window.location.reload();
      } else {
        setDeleteStep("none");
      }
    } else {
      Alert.alert("Final Confirmation", message, [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => setDeleteStep("none"),
        },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            await storage.deleteAccount();
            Alert.alert("Account Deleted", "Your account has been deleted. The app will now restart.", [
              { text: "OK", onPress: () => reloadAppAsync() },
            ]);
          },
        },
      ]);
    }
  };

  const handleCancelDelete = () => {
    setDeleteStep("none");
  };

  const handleResetForTesting = async () => {
    const message =
      "This will sign you out and reset the app to its initial state, as if you were a new user. Use this to test the landing page and onboarding flow.\n\nAll local data will be cleared.";

    if (Platform.OS === "web") {
      if (window.confirm(`Reset App for Testing?\n\n${message}`)) {
        await signOut();
        await storage.resetAllStorage();
        window.alert("App has been reset. Reloading...");
        window.location.reload();
      }
    } else {
      Alert.alert("Reset App for Testing", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await signOut();
            await storage.resetAllStorage();
            Alert.alert("App Reset", "The app has been reset to its initial state.", [
              { text: "OK", onPress: () => reloadAppAsync() },
            ]);
          },
        },
      ]);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      {isAuthenticated ? (
        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Cloud Sync
          </ThemedText>
          <View style={styles.syncRow}>
            <SyncStatusIndicator showLabel size="medium" />
          </View>
          <ThemedText type="caption" style={styles.dataInfo}>
            Signed in as {user?.email}. Your data is synced across devices.
          </ThemedText>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Notifications
        </ThemedText>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Feather name="bell" size={20} color={theme.text} />
            <View style={styles.settingText}>
              <ThemedText type="body">Expiration Alerts</ThemedText>
              <ThemedText type="caption">
                Get notified when items are about to expire
              </ThemedText>
            </View>
          </View>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{
              false: theme.backgroundSecondary,
              true: AppColors.primary,
            }}
            thumbColor="#FFFFFF"
          />
        </View>

        {preferences.notificationsEnabled ? (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="clock" size={20} color={theme.text} />
              <View style={styles.settingText}>
                <ThemedText type="body">Alert Before Expiration</ThemedText>
                <ThemedText type="caption">
                  Days before expiration to send alert
                </ThemedText>
              </View>
            </View>
            <View style={styles.daysSelector}>
              <Pressable
                onPress={() =>
                  handleExpirationDaysChange(
                    (preferences.expirationAlertDays || 3) - 1,
                  )
                }
                style={[
                  styles.dayButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="minus" size={16} color={theme.text} />
              </Pressable>
              <View
                style={[
                  styles.daysValue,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText type="body" style={styles.daysText}>
                  {preferences.expirationAlertDays || 3}
                </ThemedText>
              </View>
              <Pressable
                onPress={() =>
                  handleExpirationDaysChange(
                    (preferences.expirationAlertDays || 3) + 1,
                  )
                }
                style={[
                  styles.dayButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="plus" size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Recipe Display
        </ThemedText>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Feather name="book" size={20} color={theme.text} />
            <View style={styles.settingText}>
              <ThemedText type="body">Cooking Term Highlights</ThemedText>
              <ThemedText type="caption">
                Highlight cooking terms in recipes for quick definitions
              </ThemedText>
            </View>
          </View>
          <Switch
            value={preferences.termHighlightingEnabled ?? true}
            onValueChange={handleToggleTermHighlighting}
            trackColor={{
              false: theme.backgroundSecondary,
              true: AppColors.primary,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Meal Planning
        </ThemedText>
        <ThemedText type="caption" style={styles.dataInfo}>
          Choose how many meals you want to plan each day
        </ThemedText>
        <View style={styles.presetContainer}>
          {MEAL_PLAN_PRESETS.map((preset) => {
            const isSelected =
              (preferences.mealPlanPresetId || DEFAULT_PRESET_ID) === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() => handleSelectMealPlanPreset(preset.id)}
                style={[
                  styles.presetOption,
                  {
                    backgroundColor: isSelected
                      ? AppColors.primary
                      : theme.backgroundSecondary,
                    borderColor: isSelected ? AppColors.primary : theme.border,
                  },
                ]}
              >
                <View style={styles.presetHeader}>
                  <Feather
                    name={isSelected ? "check-circle" : "circle"}
                    size={20}
                    color={isSelected ? "#FFFFFF" : theme.textSecondary}
                  />
                  <ThemedText
                    type="body"
                    style={{
                      color: isSelected ? "#FFFFFF" : theme.text,
                      fontWeight: "600",
                    }}
                  >
                    {preset.name}
                  </ThemedText>
                </View>
                <ThemedText
                  type="caption"
                  style={{
                    color: isSelected
                      ? "rgba(255,255,255,0.8)"
                      : theme.textSecondary,
                  }}
                >
                  {preset.description}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Cuisine Preferences
        </ThemedText>
        <ThemedText type="caption" style={styles.dataInfo}>
          Select your favorite cuisines to personalize recipe suggestions
        </ThemedText>
        <View style={styles.chipContainer}>
          {CUISINE_OPTIONS.map((cuisine) => {
            const isSelected = (preferences.cuisinePreferences || []).includes(
              cuisine,
            );
            return (
              <Pressable
                key={cuisine}
                onPress={() => handleToggleCuisine(cuisine)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? AppColors.primary
                      : theme.backgroundSecondary,
                    borderColor: isSelected ? AppColors.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: isSelected ? "#FFFFFF" : theme.text }}
                >
                  {cuisine}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Allergies & Dietary Restrictions
        </ThemedText>
        <ThemedText type="caption" style={styles.dataInfo}>
          Select any allergies or dietary restrictions to avoid in recipes
        </ThemedText>
        <View style={styles.chipContainer}>
          {COMMON_ALLERGIES.map((allergy) => {
            const isSelected = (preferences.dietaryRestrictions || []).includes(
              allergy,
            );
            return (
              <Pressable
                key={allergy}
                onPress={() => handleToggleAllergy(allergy)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? AppColors.error
                      : theme.backgroundSecondary,
                    borderColor: isSelected ? AppColors.error : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: isSelected ? "#FFFFFF" : theme.text }}
                >
                  {allergy}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Nutrition Targets
        </ThemedText>
        <ThemedText type="caption" style={styles.dataInfo}>
          Set your preferred macro ratios for recipe generation. Values must
          total 100%.
        </ThemedText>

        {(["protein", "carbs", "fat"] as const).map((macro) => {
          const macros = preferences.macroTargets || DEFAULT_MACRO_TARGETS;
          const labels = { protein: "Protein", carbs: "Carbs", fat: "Fat" };
          const colors = {
            protein: AppColors.primary,
            carbs: AppColors.warning,
            fat: AppColors.accent,
          };
          return (
            <View key={macro} style={styles.macroRow}>
              <View style={styles.macroLabel}>
                <View
                  style={[
                    styles.macroIndicator,
                    { backgroundColor: colors[macro] },
                  ]}
                />
                <ThemedText type="body">{labels[macro]}</ThemedText>
              </View>
              <View style={styles.macroControls}>
                <Pressable
                  onPress={() => handleMacroChange(macro, -5)}
                  style={[
                    styles.macroButton,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="minus" size={16} color={theme.text} />
                </Pressable>
                <View
                  style={[
                    styles.macroValue,
                    { backgroundColor: colors[macro] },
                  ]}
                >
                  <ThemedText
                    type="body"
                    style={{ color: "#FFFFFF", fontWeight: "600" }}
                  >
                    {macros[macro]}%
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => handleMacroChange(macro, 5)}
                  style={[
                    styles.macroButton,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="plus" size={16} color={theme.text} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <GlassButton
          variant="outline"
          onPress={handleResetMacros}
          style={styles.resetMacroButton}
          icon={
            <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
          }
        >
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Reset to Default (50/35/15)
          </ThemedText>
        </GlassButton>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Grocery Shopping
        </ThemedText>
        <Pressable
          style={styles.integrationRow}
          onPress={() => navigation.navigate("InstacartSettings")}
          data-testid="button-instacart-settings"
        >
          <View style={styles.settingInfo}>
            <Feather name="shopping-cart" size={20} color={theme.text} />
            <View style={styles.settingText}>
              <ThemedText type="body">Instacart</ThemedText>
              <ThemedText type="caption">
                {instacartSettings.isConnected
                  ? `Connected${instacartSettings.preferredStores.length > 0 ? ` - ${instacartSettings.preferredStores.length} stores` : ""}`
                  : "Connect to order groceries"}
              </ThemedText>
            </View>
          </View>
          <View style={styles.integrationStatus}>
            {instacartSettings.isConnected && (
              <View style={[styles.statusDot, { backgroundColor: AppColors.success }]} />
            )}
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          About
        </ThemedText>

        <View style={styles.aboutItem}>
          <ThemedText type="body">Version</ThemedText>
          <ThemedText type="caption">1.0.0</ThemedText>
        </View>

        <View style={styles.aboutItem}>
          <ThemedText type="body">ChefSpAIce</ThemedText>
          <ThemedText type="caption">Your smart kitchen companion</ThemedText>
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Storage Preferences
        </ThemedText>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Feather name="database" size={20} color={theme.text} />
            <View style={styles.settingText}>
              <ThemedText type="body">Learned Preferences</ThemedText>
              <ThemedText type="caption">
                {learnedPrefsCount > 0
                  ? `${learnedPrefsCount} categories with custom storage locations`
                  : "No custom preferences yet"}
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText type="caption" style={styles.dataInfo}>
          The app learns your preferred storage locations based on your choices.
          After selecting a different location 3 or more times for a category,
          it becomes your new default.
        </ThemedText>

        {learnedPrefsCount > 0 ? (
          <GlassButton
            variant="outline"
            onPress={handleResetStoragePreferences}
            style={styles.resetButton}
            icon={
              <Feather name="refresh-cw" size={18} color={AppColors.warning} />
            }
          >
            <ThemedText style={{ color: AppColors.warning }}>
              Reset Storage Preferences
            </ThemedText>
          </GlassButton>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Account & Data
        </ThemedText>

        {deleteStep === "none" ? (
          <>
            <Pressable
              style={[styles.dangerMenuItem, { borderColor: theme.glass.border }]}
              onPress={handleClearData}
            >
              <View style={styles.dangerMenuIcon}>
                <Feather name="trash-2" size={18} color={AppColors.warning} />
              </View>
              <View style={styles.dangerMenuText}>
                <ThemedText type="body">Clear All Data</ThemedText>
                <ThemedText type="caption">
                  Remove inventory, recipes, meal plans, and chat history
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={[styles.dangerMenuItem, { borderColor: theme.glass.border }]}
              onPress={handleDeleteAccountStep1}
            >
              <View style={styles.dangerMenuIcon}>
                <Feather name="user-x" size={18} color={AppColors.error} />
              </View>
              <View style={styles.dangerMenuText}>
                <ThemedText type="body" style={{ color: AppColors.error }}>
                  Delete Account
                </ThemedText>
                <ThemedText type="caption">
                  Permanently remove your account and all data
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={[styles.dangerMenuItem, { borderColor: theme.glass.border }]}
              onPress={handleResetForTesting}
              testID="button-reset-for-testing"
              accessibilityRole="button"
              accessibilityLabel="Reset app for testing"
              accessibilityHint="Signs out and resets the app to experience it as a new user"
            >
              <View style={styles.dangerMenuIcon}>
                <Feather name="refresh-cw" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.dangerMenuText}>
                <ThemedText type="body">Reset App (For Testing)</ThemedText>
                <ThemedText type="caption">
                  Sign out and reset to test as a new user
                </ThemedText>
              </View>
            </Pressable>
          </>
        ) : (
          <View style={styles.deleteConfirmContainer}>
            <View style={[styles.warningBanner, { backgroundColor: `${AppColors.error}15` }]}>
              <Feather name="alert-triangle" size={24} color={AppColors.error} />
              <ThemedText type="body" style={{ color: AppColors.error, fontWeight: "600" }}>
                Delete Account Confirmation
              </ThemedText>
            </View>

            <ThemedText type="body" style={styles.deleteWarningText}>
              This will permanently delete your account and all data including inventory, recipes, meal plans, and preferences.
            </ThemedText>

            <View style={styles.deleteButtonRow}>
              <GlassButton
                variant="outline"
                onPress={handleCancelDelete}
                style={styles.cancelDeleteButton}
              >
                <ThemedText>Cancel</ThemedText>
              </GlassButton>
              <GlassButton
                variant="primary"
                onPress={handleDeleteAccountStep2}
                style={styles.confirmDeleteButton}
                icon={<Feather name="trash-2" size={16} color="#FFFFFF" />}
              >
                <ThemedText style={{ color: "#FFFFFF" }}>
                  Confirm Delete
                </ThemedText>
              </GlassButton>
            </View>
          </View>
        )}
      </GlassCard>

      <View style={styles.footer}>
        <ThemedText type="caption" style={styles.footerText}>
          Made with care for food lovers everywhere
        </ThemedText>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={14} color={AppColors.success} />
            <ThemedText type="caption">USDA Nutrition Data</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={14} color={AppColors.success} />
            <ThemedText type="caption">AI Recipe Generation</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="check-circle" size={14} color={AppColors.success} />
            <ThemedText type="caption">Barcode Scanning</ThemedText>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
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
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  syncRow: {
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
  aboutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  dataInfo: {},
  clearButton: {
    borderColor: AppColors.error,
  },
  resetButton: {
    borderColor: AppColors.warning,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  footerText: {
    textAlign: "center",
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetContainer: {
    gap: Spacing.sm,
  },
  presetOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  presetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  macroLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  macroIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  macroButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  macroValue: {
    minWidth: 56,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  resetMacroButton: {
    marginTop: Spacing.sm,
  },
  accountMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  accountMenuContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  accountMenuText: {
    gap: Spacing.xs,
  },
  dangerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  dangerMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dangerMenuText: {
    flex: 1,
    gap: 2,
  },
  deleteConfirmContainer: {
    gap: Spacing.md,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deleteWarningText: {
    lineHeight: 22,
  },
  deleteButtonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelDeleteButton: {
    flex: 1,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: AppColors.error,
  },
  daysSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  daysValue: {
    minWidth: 40,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  daysText: {
    fontWeight: "600",
  },
  integrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  integrationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
