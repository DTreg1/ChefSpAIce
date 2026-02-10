import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { WasteReductionStats } from "@/components/WasteReductionStats";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useManageSubscription } from "@/hooks/useManageSubscription";
import { useOnboardingStatus } from "@/contexts/OnboardingContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  FoodItem,
  Recipe,
  getExpirationStatus,
  OnboardingStatus,
  UserProfile,
  UserPreferences,
} from "@/lib/storage";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark, colorScheme, themePreference, setThemePreference } =
    useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, isAuthenticated, signOut } = useAuth();
  const { tier, planType, isActive, isTrialing, trialDaysRemaining } =
    useSubscription();
  const { handleManageSubscription } = useManageSubscription();
  const { resetOnboarding } = useOnboardingStatus();

  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "Food Manager",
    createdAt: new Date().toISOString(),
    isLoggedIn: true,
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [],
    cuisinePreferences: [],
    notificationsEnabled: true,
    expirationAlertDays: 3,
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const menuItems: MenuItemConfig[] = [
    {
      label: "Settings",
      icon: "settings",
      onPress: () => navigation.navigate("Settings"),
    },
  ];

  const loadData = useCallback(async () => {
    const [items, loadedRecipes, status, profile, prefs] = await Promise.all([
      storage.getInventory(),
      storage.getRecipes(),
      storage.getOnboardingStatus(),
      storage.getUserProfile(),
      storage.getPreferences(),
    ]);
    setInventory(items);
    setRecipes(loadedRecipes);
    setOnboardingStatus(status);
    setUserProfile(profile);
    setPreferences(prefs);
    setEditedName(profile.displayName);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const expiredCount = inventory.filter(
    (i) => getExpirationStatus(i.expirationDate) === "expired",
  ).length;
  const expiringCount = inventory.filter(
    (i) => getExpirationStatus(i.expirationDate) === "expiring",
  ).length;
  const freshCount = inventory.filter(
    (i) => getExpirationStatus(i.expirationDate) === "fresh",
  ).length;

  const storageBreakdown = {
    fridge: inventory.filter((i) => i.storageLocation === "fridge").length,
    freezer: inventory.filter((i) => i.storageLocation === "freezer").length,
    pantry: inventory.filter((i) => i.storageLocation === "pantry").length,
    counter: inventory.filter((i) => i.storageLocation === "counter").length,
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      await storage.updateAvatarUri(uri);
      setUserProfile((prev) => ({ ...prev, avatarUri: uri }));
    }
  };

  const handleSaveName = async () => {
    if (editedName.trim()) {
      await storage.updateDisplayName(editedName.trim());
      setUserProfile((prev) => ({ ...prev, displayName: editedName.trim() }));
    }
    setIsEditingName(false);
  };

  const handleToggleNotifications = async (value: boolean) => {
    const newPrefs = { ...preferences, notificationsEnabled: value };
    setPreferences(newPrefs);
    await storage.setPreferences(newPrefs);
  };

  const handleLogout = () => {
    const message =
      "Are you sure you want to sign out? Your local data will be preserved.";

    if (Platform.OS === "web") {
      if (window.confirm(`Sign Out?\n\n${message}`)) {
        performLogout();
      }
    } else {
      Alert.alert("Sign Out", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: performLogout,
        },
      ]);
    }
  };

  const performLogout = async () => {
    await signOut();
    await storage.logout();
    resetOnboarding();
  };

  const handleUpgradeSubscription = () => {
    // Navigate to SubscriptionScreen where users can choose between Basic and Pro
    navigation.navigate("Subscription" as any);
  };

  const accountCreatedDate =
    isAuthenticated && user?.createdAt
      ? new Date(user.createdAt)
      : new Date(userProfile.createdAt);

  const memberSinceDate = accountCreatedDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Profile"
        screenKey="profile"
        showSearch={false}
        menuItems={menuItems}
      />
      <ScrollView
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
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar}>
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={25}
                tint={colorScheme === "dark" ? "dark" : "light"}
                style={[
                  styles.avatarGlassRing,
                  {
                    backgroundColor: theme.glass.background,
                    borderColor: theme.glass.border,
                  },
                ]}
              >
                {userProfile.avatarUri ? (
                  <Image
                    source={{ uri: userProfile.avatarUri }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    accessibilityLabel="Profile photo"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: AppColors.primary },
                    ]}
                  >
                    <Feather name="user" size={40} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Feather name="camera" size={12} color="#FFFFFF" />
                </View>
              </BlurView>
            ) : (
              <View
                style={[
                  styles.avatarGlassRing,
                  {
                    backgroundColor: theme.glass.background,
                    borderColor: theme.glass.border,
                  },
                ]}
              >
                {userProfile.avatarUri ? (
                  <Image
                    source={{ uri: userProfile.avatarUri }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    accessibilityLabel="Profile photo"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: AppColors.primary },
                    ]}
                  >
                    <Feather name="user" size={40} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Feather name="camera" size={12} color="#FFFFFF" />
                </View>
              </View>
            )}
          </Pressable>

          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                style={[
                  styles.nameInput,
                  {
                    color: theme.text,
                    borderColor: AppColors.primary,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
                autoFocus
                selectTextOnFocus
                onBlur={handleSaveName}
                onSubmitEditing={handleSaveName}
              />
              <Pressable onPress={handleSaveName} style={styles.saveButton} accessibilityLabel="Save name">
                <Feather name="check" size={20} color={AppColors.primary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsEditingName(true)}
              style={styles.nameContainer}
            >
              <ThemedText type="h3">{userProfile.displayName}</ThemedText>
              <Feather name="edit-2" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
          <ThemedText type="caption">Member since {memberSinceDate}</ThemedText>
        </View>

        <GlassCard style={styles.preferencesCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            App Preferences
          </ThemedText>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <View
                style={[
                  styles.preferenceIcon,
                  { backgroundColor: `${AppColors.accent}15` },
                ]}
              >
                <Feather
                  name={isDark ? "moon" : "sun"}
                  size={20}
                  color={AppColors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="body">Theme</ThemedText>
                <ThemedText type="caption"></ThemedText>
              </View>
            </View>
            <View style={styles.themeToggleGroup}>
              {(["light", "system", "dark"] as ThemePreference[]).map(
                (option) => {
                  const isSelected = themePreference === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setThemePreference(option)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      style={[
                        styles.themeToggleButton,
                        {
                          backgroundColor: isSelected
                            ? AppColors.primary
                            : theme.glass.background,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? AppColors.primary
                            : theme.glass.border,
                        },
                      ]}
                      data-testid={`button-theme-${option}`}
                    >
                      <Feather
                        name={
                          option === "light"
                            ? "sun"
                            : option === "dark"
                              ? "moon"
                              : "monitor"
                        }
                        size={16}
                        color={isSelected ? "#FFFFFF" : theme.textSecondary}
                      />
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: theme.glass.border }]}
          />

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <View
                style={[
                  styles.preferenceIcon,
                  { backgroundColor: `${AppColors.primary}15` },
                ]}
              >
                <Feather name="bell" size={20} color={AppColors.primary} />
              </View>
              <View>
                <ThemedText type="body">Notifications</ThemedText>
                <ThemedText type="caption">
                  Expiration alerts and reminders
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
        </GlassCard>

        <GlassCard style={styles.statsCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Inventory Overview
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: AppColors.primary }}>
                {inventory.length}
              </ThemedText>
              <ThemedText type="caption">Total Items</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: AppColors.success }}>
                {freshCount}
              </ThemedText>
              <ThemedText type="caption">Fresh</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: AppColors.warning }}>
                {expiringCount}
              </ThemedText>
              <ThemedText type="caption">Expiring</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: AppColors.error }}>
                {expiredCount}
              </ThemedText>
              <ThemedText type="caption">Expired</ThemedText>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.statsCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Storage Distribution
          </ThemedText>
          <View style={styles.storageList}>
            {Object.entries(storageBreakdown).map(([location, count]) => (
              <View key={location} style={styles.storageRow}>
                <View style={styles.storageLabel}>
                  <Feather
                    name={
                      location === "fridge"
                        ? "thermometer"
                        : location === "freezer"
                          ? "wind"
                          : location === "pantry"
                            ? "archive"
                            : "coffee"
                    }
                    size={18}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="body" style={styles.storageName}>
                    {location.charAt(0).toUpperCase() + location.slice(1)}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.storageBar,
                    { backgroundColor: theme.glass.background },
                  ]}
                >
                  <View
                    style={[
                      styles.storageProgress,
                      {
                        width: `${inventory.length > 0 ? (count / inventory.length) * 100 : 0}%`,
                        backgroundColor: AppColors.primary,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="body" style={styles.storageCount}>
                  {count}
                </ThemedText>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.statsCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Recipe Stats
          </ThemedText>
          <View style={styles.recipeStats}>
            <View style={styles.recipeStat}>
              <Feather name="book-open" size={24} color={AppColors.primary} />
              <ThemedText type="h3">{recipes.length}</ThemedText>
              <ThemedText type="caption">Total Recipes</ThemedText>
            </View>
            <View style={styles.recipeStat}>
              <Feather name="heart" size={24} color={AppColors.error} />
              <ThemedText type="h3">
                {recipes.filter((r) => r.isFavorite).length}
              </ThemedText>
              <ThemedText type="caption">Favorites</ThemedText>
            </View>
            <View style={styles.recipeStat}>
              <Feather name="zap" size={24} color={AppColors.secondary} />
              <ThemedText type="h3">
                {recipes.filter((r) => r.isAIGenerated).length}
              </ThemedText>
              <ThemedText type="caption">AI Generated</ThemedText>
            </View>
          </View>
        </GlassCard>

        <WasteReductionStats compact />

        {expiringCount > 0 ? (
          <GlassCard
            style={{ backgroundColor: `${AppColors.warning}15` }}
            contentStyle={styles.alertCard}
            onPress={() => navigation.navigate("Analytics")}
          >
            <Feather
              name="alert-triangle"
              size={24}
              color={AppColors.warning}
            />
            <View style={styles.alertContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {expiringCount} items expiring soon
              </ThemedText>
              <ThemedText type="caption">
                Check your inventory to use them before they expire
              </ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </GlassCard>
        ) : null}

        {onboardingStatus?.cookwareSetupSkipped &&
        !onboardingStatus?.cookwareSetupCompleted ? (
          <GlassCard
            style={{ backgroundColor: `${AppColors.primary}15` }}
            contentStyle={styles.alertCard}
            onPress={() => navigation.navigate("Cookware")}
          >
            <Feather name="tool" size={24} color={AppColors.primary} />
            <View style={styles.alertContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Set up your kitchen cookware
              </ThemedText>
              <ThemedText type="caption">
                Get better recipe suggestions based on what you have
              </ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </GlassCard>
        ) : null}

        <GlassCard style={styles.menuCard}>
          <Pressable
            style={styles.menuItem}
            onPress={() => navigation.navigate("Subscription")}
            accessibilityLabel="Subscription"
            data-testid="link-subscription"
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: `${AppColors.warning}15` },
              ]}
            >
              <Feather name="star" size={20} color={AppColors.warning} />
            </View>
            <ThemedText type="body" style={styles.menuLabel}>
              Subscription
            </ThemedText>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
          <View
            style={[
              styles.menuDivider,
              { backgroundColor: theme.glass.border },
            ]}
          />
          <Pressable
            style={styles.menuItem}
            onPress={() => navigation.navigate("Analytics")}
            accessibilityLabel="Analytics"
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: `${AppColors.primary}15` },
              ]}
            >
              <Feather name="bar-chart-2" size={20} color={AppColors.primary} />
            </View>
            <ThemedText type="body" style={styles.menuLabel}>
              Food Waste Analytics
            </ThemedText>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
          <View
            style={[
              styles.menuDivider,
              { backgroundColor: theme.glass.border },
            ]}
          />
          <Pressable
            style={styles.menuItem}
            onPress={() => navigation.navigate("StorageLocations")}
            accessibilityLabel="Storage locations"
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: `${AppColors.accent}15` },
              ]}
            >
              <Feather name="package" size={20} color={AppColors.accent} />
            </View>
            <ThemedText type="body" style={styles.menuLabel}>
              Storage Locations
            </ThemedText>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
          <View
            style={[
              styles.menuDivider,
              { backgroundColor: theme.glass.border },
            ]}
          />
          <Pressable
            style={styles.menuItem}
            onPress={() => navigation.navigate("CookingTerms")}
            accessibilityLabel="Cooking terms"
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: `${AppColors.secondary}15` },
              ]}
            >
              <Feather name="book" size={20} color={AppColors.secondary} />
            </View>
            <ThemedText type="body" style={styles.menuLabel}>
              Cooking Terms Glossary
            </ThemedText>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
          <View
            style={[
              styles.menuDivider,
              { backgroundColor: theme.glass.border },
            ]}
          />
          <Pressable
            style={styles.menuItem}
            onPress={() => navigation.navigate("Cookware")}
            accessibilityLabel="Cookware"
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: `${AppColors.accent}15` },
              ]}
            >
              <Feather name="tool" size={20} color={AppColors.accent} />
            </View>
            <ThemedText type="body" style={styles.menuLabel}>
              Kitchen Cookware
            </ThemedText>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
          {__DEV__ ? (
            <>
              <View
                style={[
                  styles.menuDivider,
                  { backgroundColor: theme.glass.border },
                ]}
              />
              <Pressable
                style={styles.menuItem}
                onPress={() => navigation.navigate("GlassLeaf")}
                accessibilityLabel="Dev components"
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: `${AppColors.warning}15` },
                  ]}
                >
                  <Feather name="code" size={20} color={AppColors.warning} />
                </View>
                <ThemedText type="body" style={styles.menuLabel}>
                  Component Library
                </ThemedText>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </>
          ) : null}
        </GlassCard>

        {isAuthenticated ? (
          <>
            <GlassCard style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View
                  style={[
                    styles.accountIcon,
                    { backgroundColor: `${AppColors.primary}15` },
                  ]}
                >
                  <Feather name="cloud" size={24} color={AppColors.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Cloud Sync Active
                  </ThemedText>
                  <ThemedText type="caption">
                    Signed in as {user?.email}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.syncBadge,
                    { backgroundColor: `${AppColors.success}15` },
                  ]}
                >
                  <Feather name="check" size={14} color={AppColors.success} />
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <View
                  style={[
                    styles.subscriptionIcon,
                    { backgroundColor: `${AppColors.accent}15` },
                  ]}
                >
                  <Feather
                    name="credit-card"
                    size={24}
                    color={AppColors.accent}
                  />
                </View>
                <View style={styles.subscriptionInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {isActive
                      ? isTrialing
                        ? `Pro Trial${trialDaysRemaining !== null ? ` - ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left` : ""}`
                        : tier === "PRO"
                          ? "Pro Subscription"
                          : "Basic Plan"
                      : "Basic Plan"}
                  </ThemedText>
                  <ThemedText type="caption">
                    {isActive
                      ? isTrialing
                        ? "Full Pro access during trial"
                        : tier === "PRO"
                          ? `Pro Plan${planType === "annual" ? " (Annual)" : planType === "monthly" ? " (Monthly)" : ""}`
                          : "25 items, 5 AI recipes, 5 cookware"
                      : "25 items, 5 AI recipes, 5 cookware"}
                  </ThemedText>
                </View>
              </View>
              {isActive && tier === "PRO" && !isTrialing ? (
                <Pressable
                  style={styles.manageSubscriptionButton}
                  onPress={handleManageSubscription}
                  data-testid="button-manage-subscription"
                >
                  <ThemedText type="body" style={{ color: AppColors.accent }}>
                    Manage Subscription
                  </ThemedText>
                  <Feather
                    name="external-link"
                    size={16}
                    color={AppColors.accent}
                  />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.manageSubscriptionButton}
                  onPress={handleUpgradeSubscription}
                  data-testid="button-upgrade-subscription"
                >
                  <ThemedText type="body" style={{ color: AppColors.primary }}>
                    Choose Plan
                  </ThemedText>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color={AppColors.primary}
                  />
                </Pressable>
              )}
            </GlassCard>

            <GlassCard style={styles.logoutCard}>
              <Pressable
                style={styles.logoutButton}
                onPress={handleLogout}
                testID="button-sign-out"
                accessibilityLabel="Sign Out"
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: `${AppColors.error}15` },
                  ]}
                >
                  <Feather name="log-out" size={20} color={AppColors.error} />
                </View>
                <ThemedText
                  type="body"
                  style={[styles.menuLabel, { color: AppColors.error }]}
                >
                  Sign Out
                </ThemedText>
              </Pressable>
            </GlassCard>
          </>
        ) : (
          <GlassCard
            contentStyle={styles.signInCard}
            onPress={() =>
              navigation
                .getParent()
                ?.getParent()
                ?.reset({ index: 0, routes: [{ name: "Onboarding" }] })
            }
          >
            <View style={styles.signInContent}>
              <View
                style={[
                  styles.signInIcon,
                  { backgroundColor: `${AppColors.primary}15` },
                ]}
              >
                <Feather name="cloud" size={28} color={AppColors.primary} />
              </View>
              <View style={styles.signInText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Sign in to enable cloud sync
                </ThemedText>
                <ThemedText type="caption">
                  Back up your data and access it from any device
                </ThemedText>
              </View>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </GlassCard>
        )}
      </ScrollView>
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
  avatarSection: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  avatarGlassRing: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nameEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "600",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    minWidth: 150,
    textAlign: "center",
  },
  saveButton: {
    padding: Spacing.sm,
  },
  preferencesCard: {
    gap: Spacing.md,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preferenceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  statsCard: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  storageList: {
    gap: Spacing.md,
  },
  storageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  storageLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: 100,
  },
  storageName: {
    textTransform: "capitalize",
  },
  storageBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  storageProgress: {
    height: "100%",
    borderRadius: 4,
  },
  storageCount: {
    width: 30,
    textAlign: "right",
    fontWeight: "600",
  },
  recipeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  recipeStat: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  logoutCard: {
    padding: 0,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  accountCard: {
    padding: Spacing.lg,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  syncBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  subscriptionCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  subscriptionInfo: {
    flex: 1,
  },
  manageSubscriptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  signInCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  signInContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  signInIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  signInText: {
    flex: 1,
  },
  themeToggleGroup: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  themeToggleButton: {
    width: 36,
    height: 36,
    minHeight: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
