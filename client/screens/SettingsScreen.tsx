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

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Switch,
  Alert,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { reloadAppAsync } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { TrialStatusBadge } from "@/components/TrialStatusBadge";
import { RegisterPrompt } from "@/components/RegisterPrompt";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  UserPreferences,
  DEFAULT_MACRO_TARGETS,
  MacroTargets,
} from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
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

const HOUSEHOLD_SIZE_OPTIONS = [
  { value: 1, label: "1 person" },
  { value: 2, label: "2 people" },
  { value: 3, label: "3 people" },
  { value: 4, label: "4 people" },
  { value: 5, label: "5 people" },
  { value: 6, label: "6+ people" },
];

const STORAGE_AREA_OPTIONS = [
  { id: "fridge", label: "Fridge", icon: "thermometer" as const },
  { id: "freezer", label: "Freezer", icon: "wind" as const },
  { id: "pantry", label: "Pantry", icon: "archive" as const },
  { id: "counter", label: "Counter", icon: "coffee" as const },
];

const DAILY_MEALS_OPTIONS = [
  { value: 2, label: "2 meals" },
  { value: 3, label: "3 meals" },
  { value: 4, label: "4 meals" },
  { value: 5, label: "5+ meals" },
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const biometric = useBiometricAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [],
    cuisinePreferences: [],
    notificationsEnabled: true,
    expirationAlertDays: 3,
    termHighlightingEnabled: true,
    macroTargets: DEFAULT_MACRO_TARGETS,
  });
  const [learnedPrefsCount, setLearnedPrefsCount] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const menuItems: MenuItemConfig[] = [];

  const loadData = useCallback(async () => {
    const [prefs, prefsCount] = await Promise.all([
      storage.getPreferences(),
      getLearnedPreferencesCount(),
    ]);
    setPreferences(prefs);
    setLearnedPrefsCount(prefsCount);
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

  const handleServingSizeChange = async (size: number) => {
    const newPrefs = { ...preferences, servingSize: size };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleDailyMealsChange = async (meals: number) => {
    const newPrefs = { ...preferences, dailyMeals: meals };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleToggleStorageArea = async (areaId: string) => {
    const current = preferences.storageAreas || [
      "fridge",
      "freezer",
      "pantry",
      "counter",
    ];
    const updated = current.includes(areaId)
      ? current.filter((a) => a !== areaId)
      : [...current, areaId];
    if (updated.length === 0) return;
    const newPrefs = { ...preferences, storageAreas: updated };
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
        window.alert(
          "All your data has been deleted. The app will now reload.",
        );
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
            Alert.alert(
              "Data Cleared",
              "All your data has been deleted. The app will now reload.",
              [
                {
                  text: "OK",
                  onPress: () => reloadAppAsync(),
                },
              ],
            );
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

  const handleDeleteAccountPress = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText("");
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setIsDeleting(true);
    try {
      const authToken = await storage.getAuthToken();
      if (authToken && user?.email) {
        const baseUrl = getApiUrl();
        const response = await fetch(`${baseUrl}/api/auth/account`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: user.email }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete account");
        }
      }

      await storage.deleteAccount();

      setShowDeleteModal(false);
      setIsDeleting(false);

      if (Platform.OS === "web") {
        window.alert("Your account has been permanently deleted. The app will now restart.");
        window.location.reload();
      } else {
        Alert.alert(
          "Account Deleted",
          "Your account has been permanently deleted. The app will now restart.",
          [{ text: "OK", onPress: () => reloadAppAsync() }]
        );
      }
    } catch (error) {
      setIsDeleting(false);
      const msg = error instanceof Error ? error.message : "Unknown error";
      if (Platform.OS === "web") {
        window.alert(`Failed to delete account: ${msg}`);
      } else {
        Alert.alert("Error", `Failed to delete account: ${msg}`);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText("");
    setIsDeleting(false);
  };

  const handleExportData = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("Export Data", "Data export is available on the web version of ChefSpAIce.");
      return;
    }
    setIsExporting(true);
    try {
      const baseUrl = getApiUrl();
      const token = await (async () => {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const stored = await AsyncStorage.getItem("@chefspaice/auth_token");
        return stored ? JSON.parse(stored) : null;
      })();

      if (!token) {
        window.alert("You must be signed in to export data.");
        return;
      }

      const res = await fetch(`${baseUrl}/api/sync/export`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Export failed");
      }

      const backupData = await res.json();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chefspaice-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.alert("Your data backup has been downloaded.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Export failed";
      window.alert(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFilePick = () => {
    if (Platform.OS === "web") {
      if (!fileInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.style.display = "none";
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      fileInputRef.current.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target?.result as string);
            if (!parsed.version || !parsed.data) {
              window.alert("Invalid backup file. The file does not appear to be a valid ChefSpAIce backup.");
              return;
            }
            setPendingImportFile(parsed);
            setShowImportDialog(true);
          } catch {
            window.alert("Invalid file. Could not parse the selected file as JSON.");
          }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      fileInputRef.current.click();
    } else {
      Alert.alert("Import Data", "Data import from backup files is available on the web version of ChefSpAIce.");
    }
  };

  const handleImportData = async (mode: "merge" | "replace") => {
    if (!pendingImportFile) return;
    setShowImportDialog(false);
    setIsImporting(true);
    try {
      const baseUrl = getApiUrl();
      const token = await (async () => {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const stored = await AsyncStorage.getItem("@chefspaice/auth_token");
        return stored ? JSON.parse(stored) : null;
      })();

      if (!token) {
        Alert.alert("Error", "You must be signed in to import data.");
        return;
      }

      const res = await fetch(`${baseUrl}/api/sync/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backup: pendingImportFile, mode }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Import failed");
      }

      let message = "Your data has been imported successfully.";
      if (result.warnings && result.warnings.length > 0) {
        message += "\n\nNote: " + result.warnings.join("\n");
      }

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Import Complete", message);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Import failed";
      if (Platform.OS === "web") {
        window.alert(`Import failed: ${msg}`);
      } else {
        Alert.alert("Import Failed", msg);
      }
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
    }
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
            Alert.alert(
              "App Reset",
              "The app has been reset to its initial state.",
              [{ text: "OK", onPress: () => reloadAppAsync() }],
            );
          },
        },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Settings"
        screenKey="settings"
        showSearch={false}
        showBackButton={true}
        menuItems={menuItems}
      />
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <TrialStatusBadge />
        <RegisterPrompt variant="card" showInSettings />

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

        {isAuthenticated &&
        biometric.isAvailable &&
        biometric.isEnrolled &&
        Platform.OS !== "web" ? (
          <GlassCard style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Security
            </ThemedText>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather
                  name={
                    biometric.biometricType === "Face ID"
                      ? "eye"
                      : "smartphone"
                  }
                  size={20}
                  color={theme.text}
                />
                <View style={styles.settingText}>
                  <ThemedText type="body">
                    {biometric.biometricType || "Biometric"} Login
                  </ThemedText>
                  <ThemedText type="caption">
                    Require {biometric.biometricType || "biometric verification"}{" "}
                    to access the app
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={biometric.isEnabled}
                onValueChange={async (value) => {
                  await biometric.setEnabled(value);
                }}
                trackColor={{
                  false: theme.backgroundSecondary,
                  true: AppColors.primary,
                }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`Toggle ${biometric.biometricType || "biometric"} login`}
                data-testid="switch-biometric-login"
              />
            </View>
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
                (preferences.mealPlanPresetId || DEFAULT_PRESET_ID) ===
                preset.id;
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
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
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
            Household Size
          </ThemedText>
          <ThemedText type="caption" style={styles.dataInfo}>
            Set your household size for personalized portion suggestions
          </ThemedText>
          <View style={styles.chipContainer}>
            {HOUSEHOLD_SIZE_OPTIONS.map((option) => {
              const isSelected =
                (preferences.servingSize || 2) === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleServingSizeChange(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? AppColors.primary
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                  data-testid={`button-household-size-${option.value}`}
                >
                  <ThemedText
                    type="small"
                    style={{ color: isSelected ? "#FFFFFF" : theme.text }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Daily Meals
          </ThemedText>
          <ThemedText type="caption" style={styles.dataInfo}>
            How many meals do you typically eat per day?
          </ThemedText>
          <View style={styles.chipContainer}>
            {DAILY_MEALS_OPTIONS.map((option) => {
              const isSelected = (preferences.dailyMeals || 3) === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleDailyMealsChange(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? AppColors.primary
                        : theme.backgroundSecondary,
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
                    },
                  ]}
                  data-testid={`button-daily-meals-${option.value}`}
                >
                  <ThemedText
                    type="small"
                    style={{ color: isSelected ? "#FFFFFF" : theme.text }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Kitchen Storage Areas
          </ThemedText>
          <ThemedText type="caption" style={styles.dataInfo}>
            Select which storage areas you have in your kitchen
          </ThemedText>
          <View style={styles.chipContainer}>
            {STORAGE_AREA_OPTIONS.map((area) => {
              const currentAreas = preferences.storageAreas || [
                "fridge",
                "freezer",
                "pantry",
                "counter",
              ];
              const isSelected = currentAreas.includes(area.id);
              return (
                <Pressable
                  key={area.id}
                  onPress={() => handleToggleStorageArea(area.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? AppColors.accent
                        : theme.backgroundSecondary,
                      borderColor: isSelected ? AppColors.accent : theme.border,
                    },
                  ]}
                  data-testid={`button-storage-area-${area.id}`}
                >
                  <Feather
                    name={area.icon}
                    size={14}
                    color={isSelected ? "#FFFFFF" : theme.text}
                    style={{ marginRight: 4 }}
                  />
                  <ThemedText
                    type="small"
                    style={{ color: isSelected ? "#FFFFFF" : theme.text }}
                  >
                    {area.label}
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
              const isSelected = (
                preferences.cuisinePreferences || []
              ).includes(cuisine);
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
                      borderColor: isSelected
                        ? AppColors.primary
                        : theme.border,
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
              const isSelected = (
                preferences.dietaryRestrictions || []
              ).includes(allergy);
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
              <Feather
                name="refresh-cw"
                size={16}
                color={theme.textSecondary}
              />
            }
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Reset to Default (50/35/15)
            </ThemedText>
          </GlassButton>
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
            Integrations
          </ThemedText>

          <Pressable
            style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
            onPress={() => navigation.navigate("SiriShortcutsGuide")}
            data-testid="button-siri-shortcuts"
          >
            <View style={styles.legalMenuIcon}>
              <Feather name="mic" size={18} color={theme.text} />
            </View>
            <View style={styles.legalMenuText}>
              <ThemedText type="body">Siri Shortcuts</ThemedText>
              <ThemedText type="caption">
                Set up voice commands for your kitchen
              </ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Legal & Support
          </ThemedText>

          <Pressable
            style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
            onPress={() => navigation.navigate("PrivacyPolicy")}
            data-testid="button-privacy-policy"
          >
            <View style={styles.legalMenuIcon}>
              <Feather name="shield" size={18} color={theme.text} />
            </View>
            <View style={styles.legalMenuText}>
              <ThemedText type="body">Privacy Policy</ThemedText>
              <ThemedText type="caption">How we handle your data</ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>

          <Pressable
            style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
            onPress={() => navigation.navigate("TermsOfService")}
            data-testid="button-terms-of-service"
          >
            <View style={styles.legalMenuIcon}>
              <Feather name="file-text" size={18} color={theme.text} />
            </View>
            <View style={styles.legalMenuText}>
              <ThemedText type="body">Terms of Service</ThemedText>
              <ThemedText type="caption">Usage terms and conditions</ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>

          <Pressable
            style={[styles.legalMenuItem, { borderColor: theme.glass.border }]}
            onPress={() => Linking.openURL("https://chefspaice.com/support")}
            data-testid="button-support"
          >
            <View style={styles.legalMenuIcon}>
              <Feather name="help-circle" size={18} color={theme.text} />
            </View>
            <View style={styles.legalMenuText}>
              <ThemedText type="body">Help & Support</ThemedText>
              <ThemedText type="caption">Get help or contact us</ThemedText>
            </View>
            <Feather
              name="external-link"
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>
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
            The app learns your preferred storage locations based on your
            choices. After selecting a different location 3 or more times for a
            category, it becomes your new default.
          </ThemedText>

          {learnedPrefsCount > 0 ? (
            <GlassButton
              variant="outline"
              onPress={handleResetStoragePreferences}
              style={styles.resetButton}
              icon={
                <Feather
                  name="refresh-cw"
                  size={18}
                  color={AppColors.warning}
                />
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

          {isAuthenticated ? (
            <>
              <Pressable
                style={[
                  styles.legalMenuItem,
                  { borderColor: theme.glass.border },
                ]}
                onPress={handleExportData}
                disabled={isExporting}
                data-testid="button-export-data"
              >
                <View style={styles.legalMenuIcon}>
                  {isExporting ? (
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  ) : (
                    <Feather name="download" size={18} color={AppColors.primary} />
                  )}
                </View>
                <View style={styles.legalMenuText}>
                  <ThemedText type="body">Export My Data</ThemedText>
                  <ThemedText type="caption">
                    Download a full backup of all your data as a JSON file
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>

              <Pressable
                style={[
                  styles.legalMenuItem,
                  { borderColor: theme.glass.border },
                ]}
                onPress={handleImportFilePick}
                disabled={isImporting}
                data-testid="button-import-data"
              >
                <View style={styles.legalMenuIcon}>
                  {isImporting ? (
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  ) : (
                    <Feather name="upload" size={18} color={AppColors.primary} />
                  )}
                </View>
                <View style={styles.legalMenuText}>
                  <ThemedText type="body">Import Data</ThemedText>
                  <ThemedText type="caption">
                    Restore data from a previously exported backup file
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            </>
          ) : null}

          <View style={{ marginTop: 16 }}>
            <ThemedText type="body" style={{ color: AppColors.error, fontWeight: "600", marginBottom: 8 }}>
              Danger Zone
            </ThemedText>
          </View>

          <Pressable
            style={[
              styles.dangerMenuItem,
              { borderColor: theme.glass.border },
            ]}
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
            style={[
              styles.dangerMenuItem,
              { borderColor: AppColors.error, borderWidth: 1 },
            ]}
            onPress={handleDeleteAccountPress}
            accessibilityRole="button"
            accessibilityLabel="Delete my account permanently"
            data-testid="button-delete-account"
          >
            <View style={styles.dangerMenuIcon}>
              <Feather name="user-x" size={18} color={AppColors.error} />
            </View>
            <View style={styles.dangerMenuText}>
              <ThemedText type="body" style={{ color: AppColors.error }}>
                Delete My Account
              </ThemedText>
              <ThemedText type="caption">
                Permanently remove your account and all data
              </ThemedText>
            </View>
          </Pressable>

          {__DEV__ ? (
            <Pressable
              style={[
                styles.dangerMenuItem,
                { borderColor: theme.glass.border },
              ]}
              onPress={handleResetForTesting}
              testID="button-reset-for-testing"
              accessibilityRole="button"
              accessibilityLabel="Reset app for testing"
              accessibilityHint="Signs out and resets the app to experience it as a new user"
            >
              <View style={styles.dangerMenuIcon}>
                <Feather
                  name="refresh-cw"
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
              <View style={styles.dangerMenuText}>
                <ThemedText type="body">Reset App (For Testing)</ThemedText>
                <ThemedText type="caption">
                  Sign out and reset to test as a new user
                </ThemedText>
              </View>
            </Pressable>
          ) : null}

          <Modal
            visible={showDeleteModal}
            transparent
            animationType="fade"
            onRequestClose={handleCancelDelete}
          >
            <View style={styles.deleteModalOverlay}>
              <View style={[styles.deleteModalContent, { backgroundColor: theme.glass.background }]}>
                <View style={[styles.warningBanner, { backgroundColor: `${AppColors.error}15` }]}>
                  <Feather name="alert-triangle" size={24} color={AppColors.error} />
                  <ThemedText type="body" style={{ color: AppColors.error, fontWeight: "600" }}>
                    Delete Account
                  </ThemedText>
                </View>

                <ThemedText type="body" style={styles.deleteWarningText}>
                  This action is permanent and cannot be undone. Deleting your account will remove:
                </ThemedText>

                <View style={{ paddingHorizontal: 4, marginBottom: 12 }}>
                  <ThemedText type="caption" style={{ marginBottom: 4 }}>
                    {"\u2022"} All inventory and pantry items
                  </ThemedText>
                  <ThemedText type="caption" style={{ marginBottom: 4 }}>
                    {"\u2022"} All saved recipes and generated images
                  </ThemedText>
                  <ThemedText type="caption" style={{ marginBottom: 4 }}>
                    {"\u2022"} Meal plans and shopping lists
                  </ThemedText>
                  <ThemedText type="caption" style={{ marginBottom: 4 }}>
                    {"\u2022"} Chat history and preferences
                  </ThemedText>
                  <ThemedText type="caption" style={{ marginBottom: 4 }}>
                    {"\u2022"} Your subscription and payment data
                  </ThemedText>
                  <ThemedText type="caption">
                    {"\u2022"} Cookware and all other account data
                  </ThemedText>
                </View>

                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: 8 }}>
                  Type DELETE to confirm:
                </ThemedText>

                <TextInput
                  style={[
                    styles.deleteConfirmInput,
                    {
                      color: theme.text,
                      borderColor: deleteConfirmText === "DELETE" ? AppColors.error : theme.glass.border,
                      backgroundColor: theme.glass.background,
                    },
                  ]}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder="Type DELETE here"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isDeleting}
                  data-testid="input-delete-confirm"
                />

                <View style={styles.deleteButtonRow}>
                  <GlassButton
                    variant="outline"
                    onPress={handleCancelDelete}
                    style={styles.cancelDeleteButton}
                    disabled={isDeleting}
                  >
                    <ThemedText>Cancel</ThemedText>
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onPress={handleDeleteAccountConfirm}
                    style={[
                      styles.confirmDeleteButton,
                      { opacity: deleteConfirmText === "DELETE" && !isDeleting ? 1 : 0.5 },
                    ]}
                    disabled={deleteConfirmText !== "DELETE" || isDeleting}
                    icon={
                      isDeleting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Feather name="trash-2" size={16} color="#FFFFFF" />
                      )
                    }
                  >
                    <ThemedText style={{ color: "#FFFFFF" }}>
                      {isDeleting ? "Deleting..." : "Delete Permanently"}
                    </ThemedText>
                  </GlassButton>
                </View>
              </View>
            </View>
          </Modal>
        </GlassCard>

        <View style={styles.footer}>
          <ThemedText type="caption" style={styles.footerText}>
            Made with care for food lovers everywhere
          </ThemedText>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Feather
                name="check-circle"
                size={14}
                color={AppColors.success}
              />
              <ThemedText type="caption">USDA Nutrition Data</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Feather
                name="check-circle"
                size={14}
                color={AppColors.success}
              />
              <ThemedText type="caption">AI Recipe Generation</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Feather
                name="check-circle"
                size={14}
                color={AppColors.success}
              />
              <ThemedText type="caption">Barcode Scanning</ThemedText>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>

      {Platform.OS === "web" && showImportDialog ? (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <Feather name="alert-circle" size={24} color={AppColors.primary} />
              <ThemedText type="h4">Import Data</ThemedText>
            </View>

            <ThemedText type="body" style={styles.modalDescription}>
              You are about to import data from a backup file. Choose how you would like to handle your existing data:
            </ThemedText>

            <View style={[styles.modalOption, { borderColor: theme.glass.border }]}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>Merge</ThemedText>
              <ThemedText type="caption">
                Combine the imported data with your existing data. Items with the same ID will be updated, and new items will be added.
              </ThemedText>
            </View>

            <View style={[styles.modalOption, { borderColor: theme.glass.border }]}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>Replace</ThemedText>
              <ThemedText type="caption">
                Remove all your existing data and replace it entirely with the imported backup. This cannot be undone.
              </ThemedText>
            </View>

            <ThemedText type="caption" style={{ marginTop: Spacing.xs }}>
              Subscription limits apply. If the backup exceeds your plan's limits, some items may be trimmed.
            </ThemedText>

            <View style={styles.modalButtons}>
              <GlassButton
                variant="outline"
                onPress={() => {
                  setShowImportDialog(false);
                  setPendingImportFile(null);
                }}
                style={styles.modalButton}
                testID="button-import-cancel"
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="secondary"
                onPress={() => handleImportData("merge")}
                style={styles.modalButton}
                testID="button-import-merge"
              >
                Merge
              </GlassButton>
              <GlassButton
                variant="primary"
                onPress={() => handleImportData("replace")}
                style={styles.modalButton}
                testID="button-import-replace"
              >
                Replace
              </GlassButton>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.lg,
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
  dataInfo: {
    marginBottom: Spacing.sm,
  },
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
  legalMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  legalMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  legalMenuText: {
    flex: 1,
    gap: 2,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteModalContent: {
    width: "100%" as any,
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
  },
  deleteConfirmInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: 2,
    textAlign: "center" as const,
    marginBottom: 16,
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
  modalOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    width: "90%" as any,
    maxWidth: 440,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  modalDescription: {
    lineHeight: 22,
  },
  modalOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  modalButtons: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
