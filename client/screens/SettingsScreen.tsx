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

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { reloadAppAsync } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

import { GlassHeader } from "@/components/GlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { Spacing, AppColors, BorderRadius, Typography } from "@/constants/theme";
import {
  storage,
  UserPreferences,
  DEFAULT_MACRO_TARGETS,
  MacroTargets,
} from "@/lib/storage";
import { apiClient } from "@/lib/api-client";
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
import { getPresetIdForDailyMeals } from "@/constants/meal-plan";
import { SettingsChipSelector } from "@/components/settings/SettingsChipSelector";
import { SettingsNutritionTargets } from "@/components/settings/SettingsNutritionTargets";
import { SettingsAbout } from "@/components/settings/SettingsAbout";
import { SettingsIntegrations } from "@/components/settings/SettingsIntegrations";
import { SettingsInstacart } from "@/components/settings/SettingsInstacart";
import { SettingsLegalSupport } from "@/components/settings/SettingsLegalSupport";
import { SettingsStoragePrefs } from "@/components/settings/SettingsStoragePrefs";
import { SettingsReferral } from "@/components/settings/SettingsReferral";
import { SettingsAccountData } from "@/components/settings/SettingsAccountData";
import { SettingsRecentlyDeleted } from "@/components/settings/SettingsRecentlyDeleted";
import { SettingsActiveSessions } from "@/components/settings/SettingsActiveSessions";
import { SettingsFooter } from "@/components/settings/SettingsFooter";
import { SettingsImportDialog } from "@/components/settings/SettingsImportDialog";

type SettingsCategory = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  authOnly?: boolean;
};

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  { key: "account", label: "Account", icon: "user", authOnly: true },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "recipeDisplay", label: "Recipe Display", icon: "book-open" },
  { key: "mealPlanning", label: "Meal Planning", icon: "calendar" },
  { key: "dietNutrition", label: "Diet & Nutrition", icon: "heart" },
  { key: "integrations", label: "Integrations", icon: "link" },
  { key: "dataPrivacy", label: "Data & Privacy", icon: "shield" },
  { key: "aboutLegal", label: "About & Legal", icon: "info" },
  { key: "referral", label: "Referral", icon: "gift", authOnly: true },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, style: themeStyle } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const biometric = useBiometricAuth();
  const { isTablet, isLandscape } = useDeviceType();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const route = useRoute<RouteProp<ProfileStackParamList, "Settings">>();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    isAuthenticated ? "account" : "notifications",
  );

  const visibleCategories = useMemo(
    () => SETTINGS_CATEGORIES.filter((c) => !c.authOnly || isAuthenticated),
    [isAuthenticated],
  );

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
  const [showDeletionLevelsModal, setShowDeletionLevelsModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<{ version: string; data: unknown } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const recentlyDeletedRef = useRef<View>(null);
  const recentlyDeletedY = useRef<number>(0);
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    shareLink: string;
    stats: { successfulReferrals: number; rewardsEarned: number; creditsRemaining: number; creditsNeededForReward: number };
  } | null>(null);
  const [isLoadingReferral, setIsLoadingReferral] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [customStorageLocations, setCustomStorageLocations] = useState<
    Array<{ key: string; label: string; icon: string }>
  >([]);
  const [showAddStorageModal, setShowAddStorageModal] = useState(false);
  const [newStorageAreaName, setNewStorageAreaName] = useState("");

  const { onAccessibilityEscape: onStorageEscape } = useFocusTrap({
    visible: showAddStorageModal,
    onDismiss: () => setShowAddStorageModal(false),
  });

  const menuItems: MenuItemConfig[] = [];

  const loadData = useCallback(async () => {
    const [prefs, prefsCount] = await Promise.all([
      storage.getPreferences(),
      getLearnedPreferencesCount(),
    ]);
    setPreferences(prefs);
    setLearnedPrefsCount(prefsCount);
    const customLocs = await storage.getCustomStorageLocations();
    setCustomStorageLocations(customLocs);
  }, []);

  const fetchReferralData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingReferral(true);
    try {
      const data = await apiClient.get<{
        referralCode: string;
        shareLink: string;
        stats: { successfulReferrals: number; rewardsEarned: number; creditsRemaining: number; creditsNeededForReward: number };
      }>("/api/referral/code");
      setReferralData(data);
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

  useEffect(() => {
    if (route.params?.scrollTo === "recentlyDeleted") {
      if (isTablet) {
        setSelectedCategory("dataPrivacy");
      } else if (recentlyDeletedY.current > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: recentlyDeletedY.current,
            animated: true,
          });
        }, 300);
      }
    }
  }, [route.params?.scrollTo, isTablet]);

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

  const handleToggleCuisine = async (cuisine: string) => {
    const current = preferences.cuisinePreferences || [];
    const updated = current.includes(cuisine)
      ? current.filter((c) => c !== cuisine)
      : [...current, cuisine];
    const newPrefs = { ...preferences, cuisinePreferences: updated };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleInstacartPreferencesChange = async (newPrefs: UserPreferences) => {
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
    const presetId = getPresetIdForDailyMeals(meals);
    const newPrefs = { ...preferences, dailyMeals: meals, mealPlanPresetId: presetId };
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

  const handleAddStorageArea = () => {
    setNewStorageAreaName("");
    setShowAddStorageModal(true);
  };

  const handleConfirmAddStorageArea = async () => {
    const trimmed = newStorageAreaName.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase().replace(/\s+/g, "_");
    const allOptions = [
      ...STORAGE_AREA_OPTIONS.map((o) => o.id),
      ...customStorageLocations.map((l) => l.key),
    ];
    if (allOptions.includes(key)) {
      Alert.alert("Already Exists", "A storage area with that name already exists.");
      return;
    }
    const newLocation = { key, label: trimmed, icon: "box" };
    await storage.addCustomStorageLocation(newLocation);
    setCustomStorageLocations((prev) => [...prev, newLocation]);
    const current = preferences.storageAreas || [
      "fridge",
      "freezer",
      "pantry",
      "counter",
    ];
    const newPrefs = {
      ...preferences,
      storageAreas: [...current, key],
    };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
    setShowAddStorageModal(false);
    setNewStorageAreaName("");
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

  const handleDeletionLevelsPress = () => setShowDeletionLevelsModal(true);
  const handleDeletionLevelsClose = () => setShowDeletionLevelsModal(false);

  const handleClearData = async () => {
    setShowDeletionLevelsModal(false);
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
    setShowDeletionLevelsModal(false);
    setShowDeleteModal(true);
    setDeleteConfirmText("");
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setIsDeleting(true);
    try {
      const authToken = await storage.getAuthToken();
      if (authToken && user?.email) {
        await apiClient.delete<void>("/api/auth/account", { email: user.email });
      }

      await storage.deleteAccount();
      await storage.resetOnboarding();
      await signOut();

      setShowDeleteModal(false);
      setIsDeleting(false);
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
      Alert.alert(
        "Export Data",
        "Data export is available on the web version of ChefSpAIce.",
      );
      return;
    }
    setIsExporting(true);
    try {
      const backupData = await apiClient.post<Record<string, unknown>>("/api/sync/export");
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
      Alert.alert(
        "Download My Data",
        "Data download is available on the web version of ChefSpAIce.",
      );
      return;
    }
    setIsDownloadingData(true);
    try {
      const responseData = await apiClient.get<Record<string, unknown>>("/api/user/export-data");
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
      fileInputRef.current.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement)?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target?.result as string);
            if (!parsed.version || !parsed.data) {
              window.alert(
                "Invalid backup file. The file does not appear to be a valid ChefSpAIce backup.",
              );
              return;
            }
            setPendingImportFile(parsed);
            setShowImportDialog(true);
          } catch {
            window.alert(
              "Invalid file. Could not parse the selected file as JSON.",
            );
          }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      fileInputRef.current.click();
    } else {
      Alert.alert(
        "Import Data",
        "Data import from backup files is available on the web version of ChefSpAIce.",
      );
    }
  };

  const handleImportData = async (mode: "merge" | "replace") => {
    if (!pendingImportFile) return;
    setShowImportDialog(false);
    setIsImporting(true);
    try {
      const result = await apiClient.post<{ warnings?: string[] }>("/api/sync/import", {
        backup: pendingImportFile,
        mode,
      });

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
    setShowDeletionLevelsModal(false);
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

  const storageAreaChipOptions = [
    ...STORAGE_AREA_OPTIONS.map((o) => ({
      value: o.id,
      label: o.label,
      icon: o.icon,
    })),
    ...customStorageLocations.map((l) => ({
      value: l.key,
      label: l.label,
      icon: l.icon as React.ComponentProps<typeof Feather>["name"],
    })),
  ];

  const cuisineChipOptions = CUISINE_OPTIONS.map((c) => ({
    value: c,
    label: c,
  }));

  const allergyChipOptions = COMMON_ALLERGIES.map((a) => ({
    value: a,
    label: a,
  }));

  const renderCategoryContent = (categoryKey: string) => {
    switch (categoryKey) {
      case "account":
        return (
          <>
            <SettingsCloudSync user={user} theme={theme} />
            <SettingsBiometric biometric={{...biometric, setEnabled: async (v: boolean) => { await biometric.setEnabled(v); }}} theme={theme} />
            <SettingsActiveSessions theme={theme} />
          </>
        );
      case "notifications":
        return (
          <SettingsNotifications
            preferences={preferences}
            onToggleNotifications={handleToggleNotifications}
            onExpirationDaysChange={handleExpirationDaysChange}
            theme={theme}
          />
        );
      case "recipeDisplay":
        return (
          <SettingsRecipeDisplay
            preferences={preferences}
            onToggleTermHighlighting={handleToggleTermHighlighting}
            theme={theme}
          />
        );
      case "mealPlanning":
        return (
          <>
            <SettingsChipSelector
              title="Household Size"
              description="Set your household size for personalized portion suggestions"
              options={householdChipOptions}
              selected={[String(preferences.servingSize || 2)]}
              onToggle={handleServingSizeChange}
              theme={theme}
            />
            <SettingsChipSelector
              title="Meal Planning"
              description="How many meals do you plan each day? This controls the meal slots shown in your meal planner."
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
              onAdd={handleAddStorageArea}
              selectedColor={AppColors.accent}
              theme={theme}
            />
          </>
        );
      case "dietNutrition":
        return (
          <>
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
          </>
        );
      case "integrations":
        return (
          <>
            <SettingsIntegrations navigation={navigation as any} theme={theme} />
            <SettingsInstacart
              preferences={preferences}
              onPreferencesChange={handleInstacartPreferencesChange}
              theme={theme}
            />
          </>
        );
      case "dataPrivacy":
        return (
          <>
            <SettingsStoragePrefs
              learnedPrefsCount={learnedPrefsCount}
              onResetStoragePreferences={handleResetStoragePreferences}
              theme={theme}
            />
            <View
              ref={recentlyDeletedRef}
              onLayout={(e) => {
                recentlyDeletedY.current = e.nativeEvent.layout.y;
              }}
            >
              <SettingsRecentlyDeleted theme={theme} />
            </View>
            <SettingsAccountData
              isAuthenticated={isAuthenticated}
              isExporting={isExporting}
              isImporting={isImporting}
              isDownloadingData={isDownloadingData}
              showDeleteModal={showDeleteModal}
              deleteConfirmText={deleteConfirmText}
              isDeleting={isDeleting}
              showDeletionLevelsModal={showDeletionLevelsModal}
              onExportData={handleExportData}
              onImportFilePick={handleImportFilePick}
              onDownloadMyData={handleDownloadMyData}
              onDeleteAccountPress={handleDeleteAccountPress}
              onDeleteAccountConfirm={handleDeleteAccountConfirm}
              onCancelDelete={handleCancelDelete}
              onDeleteConfirmTextChange={setDeleteConfirmText}
              onClearData={handleClearData}
              onResetForTesting={handleResetForTesting}
              onDeletionLevelsPress={handleDeletionLevelsPress}
              onDeletionLevelsClose={handleDeletionLevelsClose}
              theme={theme}
            />
          </>
        );
      case "aboutLegal":
        return (
          <>
            <SettingsAbout />
            <SettingsLegalSupport navigation={navigation as any} theme={theme} />
            <SettingsFooter />
          </>
        );
      case "referral":
        return (
          <SettingsReferral
            isLoadingReferral={isLoadingReferral}
            referralData={referralData}
            referralCopied={referralCopied}
            onCopyReferralCode={handleCopyReferralCode}
            onShareReferral={handleShareReferral}
            theme={theme}
          />
        );
      default:
        return null;
    }
  };

  const leftPaneWidth = isLandscape ? 320 : 280;

  const addStorageModal = (
    <Modal
      visible={showAddStorageModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAddStorageModal(false)}
      accessibilityViewIsModal={true}
    >
      <Pressable
        style={[addStorageStyles.overlay, { backgroundColor: themeStyle.surface.overlaySubtle }]}
        onPress={() => setShowAddStorageModal(false)}
        accessibilityRole="button"
        accessibilityLabel="Close add storage modal"
      >
        <Pressable
          style={[
            addStorageStyles.modal,
            { backgroundColor: theme.backgroundDefault },
          ]}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="button"
          accessibilityLabel="Add storage modal content"
          onAccessibilityEscape={onStorageEscape}
        >
          <ThemedText type="h4" style={addStorageStyles.title} accessibilityRole="header" accessibilityLabel="Add Storage Area">
            Add Storage Area
          </ThemedText>
          <ThemedText
            type="caption"
            style={[addStorageStyles.description, { color: theme.textSecondary }]}
            accessibilityRole="text"
            accessibilityLabel="Enter a name for your new storage area, for example Garage, Cellar, or Spice Rack"
          >
            Enter a name for your new storage area (e.g., Garage, Cellar, Spice Rack)
          </ThemedText>
          <TextInput
            style={[
              addStorageStyles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Storage area name"
            placeholderTextColor={theme.textSecondary}
            value={newStorageAreaName}
            onChangeText={setNewStorageAreaName}
            autoFocus
            onSubmitEditing={handleConfirmAddStorageArea}
            testID="input-new-storage-area"
            accessibilityLabel="Enter new storage area name"
            accessibilityRole="text"
          />
          <View style={addStorageStyles.buttons}>
            <Pressable
              onPress={() => setShowAddStorageModal(false)}
              style={[
                addStorageStyles.button,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              testID="button-cancel-add-storage"
              accessibilityRole="button"
              accessibilityLabel="Cancel add storage area"
            >
              <ThemedText style={addStorageStyles.buttonText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleConfirmAddStorageArea}
              style={[
                addStorageStyles.button,
                {
                  backgroundColor: AppColors.primary,
                  opacity: newStorageAreaName.trim() ? 1 : 0.5,
                },
              ]}
              disabled={!newStorageAreaName.trim()}
              testID="button-confirm-add-storage"
              accessibilityRole="button"
              accessibilityLabel="Add storage area"
              accessibilityState={{ disabled: !newStorageAreaName.trim() }}
            >
              <ThemedText style={[addStorageStyles.buttonText, { color: theme.buttonText }]}>
                Add
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (isTablet) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <GlassHeader
          title="Settings"
          screenKey="settings"
          showSearch={false}
          showBackButton={true}
          menuItems={menuItems}
        />
        <View
          style={[
            styles.splitContainer,
            { paddingTop: 56 + insets.top },
          ]}
        >
          <ScrollView
            style={[
              styles.leftPane,
              {
                width: leftPaneWidth,
                borderRightColor: theme.border,
              },
            ]}
            contentContainerStyle={[
              styles.leftPaneContent,
              { paddingBottom: tabBarHeight + Spacing.xl },
            ]}
          >
            {visibleCategories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: isSelected
                        ? AppColors.primary
                        : "transparent",
                      borderRadius: BorderRadius.md,
                    },
                  ]}
                  testID={`button-settings-category-${cat.key}`}
                >
                  <Feather
                    name={cat.icon}
                    size={18}
                    color={isSelected ? theme.buttonText : theme.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.categoryLabel,
                      { color: isSelected ? theme.buttonText : theme.text },
                    ]}
                  >
                    {cat.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          <KeyboardAwareScrollViewCompat
            ref={scrollViewRef}
            style={styles.rightPane}
            contentContainerStyle={[
              styles.rightPaneContent,
              { paddingBottom: tabBarHeight + Spacing.xl },
            ]}
            scrollIndicatorInsets={{ bottom: insets.bottom }}
          >
            {renderCategoryContent(selectedCategory)}
          </KeyboardAwareScrollViewCompat>
        </View>

        <SettingsImportDialog
          showImportDialog={showImportDialog}
          onImportData={handleImportData}
          onClose={handleImportDialogClose}
          theme={theme}
        />

        {addStorageModal}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <GlassHeader
        title="Settings"
        screenKey="settings"
        showSearch={false}
        showBackButton={true}
        menuItems={menuItems}
      />
      <KeyboardAwareScrollViewCompat
        ref={scrollViewRef}
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
        {isAuthenticated ? (
          <SettingsCloudSync user={user} theme={theme} />
        ) : null}

        {isAuthenticated ? (
          <SettingsBiometric biometric={{...biometric, setEnabled: async (v: boolean) => { await biometric.setEnabled(v); }}} theme={theme} />
        ) : null}

        {isAuthenticated ? <SettingsActiveSessions theme={theme} /> : null}

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

        <SettingsChipSelector
          title="Household Size"
          description="Set your household size for personalized portion suggestions"
          options={householdChipOptions}
          selected={[String(preferences.servingSize || 2)]}
          onToggle={handleServingSizeChange}
          theme={theme}
        />

        <SettingsChipSelector
          title="Meal Planning"
          description="How many meals do you plan each day? This controls the meal slots shown in your meal planner."
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
          onAdd={handleAddStorageArea}
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

        <SettingsIntegrations navigation={navigation as any} theme={theme} />

        <SettingsInstacart
          preferences={preferences}
          onPreferencesChange={handleInstacartPreferencesChange}
          theme={theme}
        />

        <SettingsLegalSupport navigation={navigation as any} theme={theme} />

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

        <View
          ref={recentlyDeletedRef}
          onLayout={(e) => {
            recentlyDeletedY.current = e.nativeEvent.layout.y;
          }}
        >
          <SettingsRecentlyDeleted theme={theme} />
        </View>

        <SettingsAccountData
          isAuthenticated={isAuthenticated}
          isExporting={isExporting}
          isImporting={isImporting}
          isDownloadingData={isDownloadingData}
          showDeleteModal={showDeleteModal}
          deleteConfirmText={deleteConfirmText}
          isDeleting={isDeleting}
          showDeletionLevelsModal={showDeletionLevelsModal}
          onExportData={handleExportData}
          onImportFilePick={handleImportFilePick}
          onDownloadMyData={handleDownloadMyData}
          onDeleteAccountPress={handleDeleteAccountPress}
          onDeleteAccountConfirm={handleDeleteAccountConfirm}
          onCancelDelete={handleCancelDelete}
          onDeleteConfirmTextChange={setDeleteConfirmText}
          onClearData={handleClearData}
          onResetForTesting={handleResetForTesting}
          onDeletionLevelsPress={handleDeletionLevelsPress}
          onDeletionLevelsClose={handleDeletionLevelsClose}
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

      {addStorageModal}
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
  splitContainer: {
    flex: 1,
    flexDirection: "row",
  },
  leftPane: {
    borderRightWidth: 1,
  },
  leftPaneContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.xs,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryLabel: {
    ...Typography.small,
    fontWeight: "500",
  },
  rightPane: {
    flex: 1,
  },
  rightPaneContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
});

const addStorageStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    marginBottom: 0,
  },
  description: {
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.body.fontSize,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "flex-end",
    marginTop: Spacing.xs,
  },
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: Typography.button.fontWeight,
  },
});
