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
  Alert,
  Platform,
} from "react-native";
import { reloadAppAsync } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { TrialStatusBadge } from "@/components/TrialStatusBadge";
import { RegisterPrompt } from "@/components/RegisterPrompt";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { Spacing, AppColors } from "@/constants/theme";
import {
  storage,
  UserPreferences,
  DEFAULT_MACRO_TARGETS,
  MacroTargets,
} from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import {
  clearPreferences,
  getLearnedPreferencesCount,
} from "@/lib/user-storage-preferences";
import {
  requestNotificationPermissions,
  scheduleExpirationNotifications,
  cancelAllExpirationNotifications,
} from "@/lib/notifications";

import {
  CUISINE_OPTIONS,
  COMMON_ALLERGIES,
  HOUSEHOLD_SIZE_OPTIONS,
  STORAGE_AREA_OPTIONS,
  DAILY_MEALS_OPTIONS,
} from "@/components/settings/settings-constants";
import { SettingsCloudSync } from "@/components/settings/SettingsCloudSync";
import { SettingsBiometric } from "@/components/settings/SettingsBiometric";
import { SettingsNotifications } from "@/components/settings/SettingsNotifications";
import { SettingsRecipeDisplay } from "@/components/settings/SettingsRecipeDisplay";
import { SettingsMealPlanning } from "@/components/settings/SettingsMealPlanning";
import { SettingsChipSelector } from "@/components/settings/SettingsChipSelector";
import { SettingsNutritionTargets } from "@/components/settings/SettingsNutritionTargets";
import { SettingsAbout } from "@/components/settings/SettingsAbout";
import { SettingsIntegrations } from "@/components/settings/SettingsIntegrations";
import { SettingsLegalSupport } from "@/components/settings/SettingsLegalSupport";
import { SettingsStoragePrefs } from "@/components/settings/SettingsStoragePrefs";
import { SettingsReferral } from "@/components/settings/SettingsReferral";
import { SettingsAccountData } from "@/components/settings/SettingsAccountData";
import { SettingsRecentlyDeleted } from "@/components/settings/SettingsRecentlyDeleted";
import { SettingsFooter } from "@/components/settings/SettingsFooter";
import { SettingsImportDialog } from "@/components/settings/SettingsImportDialog";

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
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    shareLink: string;
    stats: { totalReferrals: number; completedSignups: number };
  } | null>(null);
  const [isLoadingReferral, setIsLoadingReferral] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  const menuItems: MenuItemConfig[] = [];

  const loadData = useCallback(async () => {
    const [prefs, prefsCount] = await Promise.all([
      storage.getPreferences(),
      getLearnedPreferencesCount(),
    ]);
    setPreferences(prefs);
    setLearnedPrefsCount(prefsCount);
  }, []);

  const fetchReferralData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingReferral(true);
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/referral/code`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = (await response.json()).data as any;
        setReferralData(data);
      }
    } catch (error) {
      logger.error("Failed to fetch referral data:", error);
    } finally {
      setIsLoadingReferral(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      fetchReferralData();
    }, [loadData, fetchReferralData]),
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

  const handleServingSizeChange = async (sizeStr: string) => {
    const size = Number(sizeStr);
    const newPrefs = { ...preferences, servingSize: size };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleDailyMealsChange = async (mealsStr: string) => {
    const meals = Number(mealsStr);
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

    const maxAllowed = 100 - 2 * MIN_MACRO;
    const requestedValue = currentMacros[macro] + delta;
    const newValue = Math.max(MIN_MACRO, Math.min(maxAllowed, requestedValue));

    if (newValue === currentMacros[macro]) {
      return;
    }

    const remaining = 100 - newValue;

    const allMacros: (keyof MacroTargets)[] = ["protein", "carbs", "fat"];
    const otherMacros = allMacros.filter((k) => k !== macro);
    const [first, second] = otherMacros;

    const currentOtherTotal = currentMacros[first] + currentMacros[second];
    let firstValue: number;
    let secondValue: number;

    if (currentOtherTotal > 0) {
      const firstRatio = currentMacros[first] / currentOtherTotal;
      firstValue = Math.round(firstRatio * remaining);
    } else {
      firstValue = Math.round(remaining / 2);
    }

    firstValue = Math.max(
      MIN_MACRO,
      Math.min(remaining - MIN_MACRO, firstValue),
    );
    secondValue = remaining - firstValue;

    if (secondValue < MIN_MACRO) {
      secondValue = MIN_MACRO;
      firstValue = remaining - MIN_MACRO;
    }

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

    finalProtein = Math.max(MIN_MACRO, Math.min(maxAllowed, finalProtein));
    finalCarbs = Math.max(MIN_MACRO, Math.min(maxAllowed, finalCarbs));
    finalFat = Math.max(MIN_MACRO, Math.min(maxAllowed, finalFat));

    const currentTotal = finalProtein + finalCarbs + finalFat;
    if (currentTotal !== 100) {
      const diff = 100 - currentTotal;
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

  const handleCopyReferralCode = async () => {
    if (!referralData?.referralCode) return;
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(referralData.shareLink);
      } else {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(referralData.shareLink);
      }
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    } catch (error) {
      logger.error("Failed to copy:", error);
    }
  };

  const handleShareReferral = async () => {
    if (!referralData?.shareLink) return;
    try {
      if (Platform.OS === "web") {
        if (navigator.share) {
          await navigator.share({
            title: "Join ChefSpAIce!",
            text: `Use my referral code ${referralData.referralCode} to get an extended 14-day free trial on ChefSpAIce!`,
            url: referralData.shareLink,
          });
        } else {
          await navigator.clipboard.writeText(referralData.shareLink);
          setReferralCopied(true);
          setTimeout(() => setReferralCopied(false), 2000);
        }
      } else {
        const { Share: RNShare } = await import("react-native");
        await RNShare.share({
          message: `Use my referral code ${referralData.referralCode} to get an extended 14-day free trial on ChefSpAIce! ${referralData.shareLink}`,
        });
      }
    } catch (error) {
      logger.error("Share failed:", error);
    }
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

      const backupData = (await res.json()).data as any;
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

  const handleDownloadMyData = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("Download My Data", "Data download is available on the web version of ChefSpAIce.");
      return;
    }
    setIsDownloadingData(true);
    try {
      const baseUrl = getApiUrl();
      const token = await (async () => {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const stored = await AsyncStorage.getItem("@chefspaice/auth_token");
        return stored ? JSON.parse(stored) : null;
      })();

      if (!token) {
        window.alert("You must be signed in to download your data.");
        return;
      }

      const res = await fetch(`${baseUrl}/api/user/export-data`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Download failed");
      }

      const responseData = (await res.json()).data as any;
      const jsonString = JSON.stringify(responseData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chefspaice-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.alert("Your personal data has been downloaded.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Download failed";
      window.alert(`Download failed: ${msg}`);
    } finally {
      setIsDownloadingData(false);
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

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || "Import failed");
      }

      const result = body.data as any;

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

  const handleImportDialogClose = () => {
    setShowImportDialog(false);
    setPendingImportFile(null);
  };

  const householdChipOptions = HOUSEHOLD_SIZE_OPTIONS.map((o) => ({
    value: String(o.value),
    label: o.label,
  }));

  const dailyMealsChipOptions = DAILY_MEALS_OPTIONS.map((o) => ({
    value: String(o.value),
    label: o.label,
  }));

  const storageAreaChipOptions = STORAGE_AREA_OPTIONS.map((o) => ({
    value: o.id,
    label: o.label,
    icon: o.icon,
  }));

  const cuisineChipOptions = CUISINE_OPTIONS.map((c) => ({
    value: c,
    label: c,
  }));

  const allergyChipOptions = COMMON_ALLERGIES.map((a) => ({
    value: a,
    label: a,
  }));

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
          <SettingsCloudSync user={user} theme={theme} />
        ) : null}

        {isAuthenticated ? (
          <SettingsBiometric biometric={biometric} theme={theme} />
        ) : null}

        <SettingsNotifications
          preferences={preferences}
          onToggleNotifications={handleToggleNotifications}
          onExpirationDaysChange={handleExpirationDaysChange}
          theme={theme}
        />

        <SettingsRecipeDisplay
          preferences={preferences}
          onToggleTermHighlighting={handleToggleTermHighlighting}
          theme={theme}
        />

        <SettingsMealPlanning
          preferences={preferences}
          onSelectPreset={handleSelectMealPlanPreset}
          theme={theme}
        />

        <SettingsChipSelector
          title="Household Size"
          description="Set your household size for personalized portion suggestions"
          options={householdChipOptions}
          selected={[String(preferences.servingSize || 2)]}
          onToggle={handleServingSizeChange}
          theme={theme}
        />

        <SettingsChipSelector
          title="Daily Meals"
          description="How many meals do you typically eat per day?"
          options={dailyMealsChipOptions}
          selected={[String(preferences.dailyMeals || 3)]}
          onToggle={handleDailyMealsChange}
          theme={theme}
        />

        <SettingsChipSelector
          title="Kitchen Storage Areas"
          description="Select which storage areas you have in your kitchen"
          options={storageAreaChipOptions}
          selected={
            preferences.storageAreas || [
              "fridge",
              "freezer",
              "pantry",
              "counter",
            ]
          }
          onToggle={handleToggleStorageArea}
          selectedColor={AppColors.accent}
          theme={theme}
        />

        <SettingsChipSelector
          title="Cuisine Preferences"
          description="Select your favorite cuisines to personalize recipe suggestions"
          options={cuisineChipOptions}
          selected={preferences.cuisinePreferences || []}
          onToggle={handleToggleCuisine}
          theme={theme}
        />

        <SettingsChipSelector
          title="Allergies & Dietary Restrictions"
          description="Select any allergies or dietary restrictions to avoid in recipes"
          options={allergyChipOptions}
          selected={preferences.dietaryRestrictions || []}
          onToggle={handleToggleAllergy}
          selectedColor={AppColors.error}
          theme={theme}
        />

        <SettingsNutritionTargets
          preferences={preferences}
          onMacroChange={handleMacroChange}
          onResetMacros={handleResetMacros}
          theme={theme}
        />

        <SettingsAbout />

        <SettingsIntegrations navigation={navigation} theme={theme} />

        <SettingsLegalSupport navigation={navigation} theme={theme} />

        <SettingsStoragePrefs
          learnedPrefsCount={learnedPrefsCount}
          onResetStoragePreferences={handleResetStoragePreferences}
          theme={theme}
        />

        {isAuthenticated && (
          <SettingsReferral
            isLoadingReferral={isLoadingReferral}
            referralData={referralData}
            referralCopied={referralCopied}
            onCopyReferralCode={handleCopyReferralCode}
            onShareReferral={handleShareReferral}
            theme={theme}
          />
        )}

        <SettingsRecentlyDeleted theme={theme} />

        <SettingsAccountData
          isAuthenticated={isAuthenticated}
          isExporting={isExporting}
          isImporting={isImporting}
          isDownloadingData={isDownloadingData}
          showDeleteModal={showDeleteModal}
          deleteConfirmText={deleteConfirmText}
          isDeleting={isDeleting}
          onExportData={handleExportData}
          onImportFilePick={handleImportFilePick}
          onDownloadMyData={handleDownloadMyData}
          onDeleteAccountPress={handleDeleteAccountPress}
          onDeleteAccountConfirm={handleDeleteAccountConfirm}
          onCancelDelete={handleCancelDelete}
          onDeleteConfirmTextChange={setDeleteConfirmText}
          onClearData={handleClearData}
          onResetForTesting={handleResetForTesting}
          theme={theme}
        />

        <SettingsFooter />
      </KeyboardAwareScrollViewCompat>

      <SettingsImportDialog
        showImportDialog={showImportDialog}
        onImportData={handleImportData}
        onClose={handleImportDialogClose}
        theme={theme}
      />
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
});
