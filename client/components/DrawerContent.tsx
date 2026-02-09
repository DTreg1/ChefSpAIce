import React from "react";
import {
  View,
  StyleSheet,
  Platform,
  Image,
  Pressable,
  Linking,
} from "react-native";
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { GlassProvider } from "@/contexts/GlassContext";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

function TrialBadge() {
  const { isAuthenticated, token } = useAuth();
  const { isTrialing, isPastDue, trialDaysRemaining, graceDaysRemaining, isLoading, subscription } =
    useSubscription();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const handleManageSubscription = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/subscriptions/create-portal-session", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = (await response.json()).data;
        if (data.url) {
          if (Platform.OS === "web") {
            window.location.href = data.url;
          } else {
            Linking.openURL(data.url);
          }
        }
      }
    } catch (error) {
      logger.error("Error opening subscription portal:", error);
    }
  };

  if (isTrialing && trialDaysRemaining !== null) {
    const trialText =
      trialDaysRemaining === 0
        ? "Trial ends today"
        : trialDaysRemaining === 1
          ? "1 day left"
          : `${trialDaysRemaining} days left`;

    return (
      <Pressable
        style={styles.trialBadge}
        onPress={handleManageSubscription}
        data-testid="drawer-trial-badge"
      >
        <Feather name="clock" size={12} color="#fff" />
        <ThemedText style={styles.trialText}>{trialText}</ThemedText>
        <Feather name="chevron-right" size={12} color="#fff" />
      </Pressable>
    );
  }

  if (isPastDue) {
    const daysText =
      graceDaysRemaining === null || graceDaysRemaining === undefined
        ? "Payment issue"
        : graceDaysRemaining === 0
          ? "Payment due today"
          : graceDaysRemaining === 1
            ? "1 day to fix payment"
            : `${graceDaysRemaining} days to fix payment`;

    return (
      <Pressable
        style={[styles.trialBadge, styles.pastDueBadge]}
        onPress={handleManageSubscription}
        data-testid="drawer-past-due-badge"
      >
        <Feather name="alert-circle" size={12} color="#fff" />
        <ThemedText style={styles.trialText}>{daysText}</ThemedText>
        <Feather name="chevron-right" size={12} color="#fff" />
      </Pressable>
    );
  }

  if (subscription?.cancelAtPeriodEnd) {
    return (
      <Pressable
        style={[styles.trialBadge, styles.cancelingBadge]}
        onPress={handleManageSubscription}
        data-testid="drawer-canceling-badge"
      >
        <Feather name="alert-triangle" size={12} color="#fff" />
        <ThemedText style={styles.trialText}>Ending soon</ThemedText>
        <Feather name="chevron-right" size={12} color="#fff" />
      </Pressable>
    );
  }

  return null;
}

interface DrawerItemProps {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  isActive?: boolean;
}

function DrawerItem({ label, icon, onPress, isActive }: DrawerItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        isActive ? { backgroundColor: theme.glass.backgroundStrong } : null,
        pressed ? { opacity: 0.7 } : null,
      ]}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
    >
      <Feather
        name={icon}
        size={22}
        color={isActive ? AppColors.primary : theme.textOnGlass}
        style={styles.drawerItemIcon}
      />
      <ThemedText
        style={[
          styles.drawerItemLabel,
          isActive ? { color: AppColors.primary, fontWeight: "600" } : null,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const { theme, isDark } = useTheme();
  const { signOut, isAuthenticated, isGuestUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { navigation, state } = props;
  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const getActiveTabAndScreen = (): {
    activeTab: string;
    activeScreen: string;
  } => {
    const tabsRoute = state.routes.find((r) => r.name === "Tabs");
    if (tabsRoute?.state) {
      const tabState = tabsRoute.state as any;
      const tabIndex = tabState.index ?? 0;
      const activeTab =
        tabState.routeNames?.[tabIndex] ||
        tabState.routes?.[tabIndex]?.name ||
        "";
      const activeTabRoute = tabState.routes?.[tabIndex];
      if (activeTabRoute?.state) {
        const stackState = activeTabRoute.state as any;
        const screenIndex = stackState.index ?? 0;
        const activeScreen = stackState.routes?.[screenIndex]?.name || "";
        return { activeTab, activeScreen };
      }
      return { activeTab, activeScreen: "" };
    }
    return { activeTab: "", activeScreen: "" };
  };

  const { activeTab, activeScreen } = getActiveTabAndScreen();

  const closeDrawer = () => {
    navigation.dispatch(DrawerActions.closeDrawer());
  };

  const menuItems: {
    label: string;
    icon: keyof typeof Feather.glyphMap;
    route: string;
    matchTab?: string;
    matchScreen?: string;
  }[] = [
    {
      label: "Kitchen",
      icon: "home",
      route: "KitchenTab",
      matchTab: "KitchenTab",
    },
    {
      label: "Recipes",
      icon: "book-open",
      route: "RecipesTab",
      matchTab: "RecipesTab",
    },
    {
      label: "Meal Plan",
      icon: "calendar",
      route: "MealPlanTab",
      matchTab: "MealPlanTab",
    },
    {
      label: "Shopping List",
      icon: "shopping-cart",
      route: "ShoppingList",
      matchTab: "MealPlanTab",
      matchScreen: "ShoppingList",
    },
  ];

  const isItemActive = (item: (typeof menuItems)[0]) => {
    if (item.matchScreen) {
      return activeScreen === item.matchScreen;
    }
    return activeTab === item.matchTab;
  };

  const renderBackground = () => {
    if (useLiquidGlass) {
      return (
        <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
      );
    }

    if (Platform.OS === "ios") {
      return (
        <BlurView
          intensity={80}
          tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterial"}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.backgroundDefault },
        ]}
      />
    );
  };

  return (
    <View style={styles.container} accessibilityRole="menu">
      {renderBackground()}
      <GlassProvider>
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing.lg },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/images/icon.png")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityElementsHidden={true}
                importantForAccessibility="no-hide-descendants"
              />
              <ThemedText style={styles.appName}>ChefSpAIce</ThemedText>
            </View>
            <ThemedText type="small" style={styles.tagline}>
              Reduce waste, eat fresh
            </ThemedText>
            <TrialBadge />
          </View>

          {!isAuthenticated && (
            <Pressable
              onPress={() => {
                closeDrawer();
                navigation.navigate("Auth" as any);
              }}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.backgroundSecondary,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  marginBottom: Spacing.md,
                },
                pressed ? { opacity: 0.7 } : null,
              ]}
              data-testid="drawer-create-account"
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: `${AppColors.primary}20`,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: Spacing.md,
                }}
              >
                <Feather name="user-plus" size={20} color={AppColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 15, fontWeight: "600" }}>
                  Create Account
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                  Save your data and unlock all features
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>
          )}

          <View
            style={[styles.divider, { backgroundColor: theme.glass.border }]}
          />

          <View style={styles.menuSection}>
            {menuItems.map((item) => (
              <DrawerItem
                key={item.route}
                label={item.label}
                icon={item.icon}
                isActive={isItemActive(item)}
                onPress={() => {
                  closeDrawer();
                  if (item.route === "ShoppingList") {
                    navigation.navigate("Tabs", {
                      screen: "MealPlanTab",
                      params: { screen: "ShoppingList" },
                    });
                  } else {
                    navigation.navigate("Tabs", { screen: item.route });
                  }
                }}
              />
            ))}
          </View>

          <View
            style={[styles.divider, { backgroundColor: theme.glass.border }]}
          />

          <View style={styles.menuSection}>
            <DrawerItem
              label="Profile"
              icon="user"
              onPress={() => {
                closeDrawer();
                navigation.navigate("Tabs", {
                  screen: "ProfileTab",
                  params: { screen: "Profile" },
                });
              }}
            />
            <DrawerItem
              label="Settings"
              icon="settings"
              isActive={activeScreen === "Settings"}
              onPress={() => {
                closeDrawer();
                navigation.navigate("Tabs", {
                  screen: "ProfileTab",
                  params: { screen: "Settings" },
                });
              }}
            />
            <DrawerItem
              label="Analytics"
              icon="bar-chart-2"
              isActive={activeScreen === "Analytics"}
              onPress={() => {
                closeDrawer();
                navigation.navigate("Tabs", {
                  screen: "ProfileTab",
                  params: { screen: "Analytics" },
                });
              }}
            />
            <DrawerItem
              label="Cooking Terms"
              icon="book"
              isActive={activeScreen === "CookingTerms"}
              onPress={() => {
                closeDrawer();
                navigation.navigate("Tabs", {
                  screen: "ProfileTab",
                  params: { screen: "CookingTerms" },
                });
              }}
            />
            <DrawerItem
              label="Cookware"
              icon="tool"
              isActive={activeScreen === "Cookware"}
              onPress={() => {
                closeDrawer();
                navigation.navigate("Tabs", {
                  screen: "ProfileTab",
                  params: { screen: "Cookware" },
                });
              }}
            />
          </View>
        </DrawerContentScrollView>

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <View
            style={[styles.divider, { backgroundColor: theme.glass.border }]}
          />
          <Pressable
            style={({ pressed }) => [
              styles.addItemButton,
              {
                backgroundColor: theme.glass.backgroundStrong,
                borderWidth: 1,
                borderColor: theme.glass.border,
              },
              pressed ? { opacity: 0.8 } : null,
            ]}
            onPress={() => {
              closeDrawer();
              signOut();
            }}
            testID="button-drawer-sign-out"
            accessibilityLabel="Sign Out"
          >
            <Feather
              name="log-out"
              size={20}
              color={theme.textSecondaryOnGlass}
              style={{ marginRight: Spacing.sm }}
            />
            <ThemedText type="caption">Sign Out</ThemedText>
          </Pressable>
        </View>
      </GlassProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.primary,
  },
  tagline: {
    opacity: 0.6,
    marginLeft: 52,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  menuSection: {
    gap: Spacing.xs,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  drawerItemIcon: {
    marginRight: Spacing.md,
  },
  drawerItemLabel: {
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  addItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: AppColors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
    marginLeft: 52,
    marginTop: Spacing.sm,
  },
  pastDueBadge: {
    backgroundColor: AppColors.warning,
  },
  cancelingBadge: {
    backgroundColor: AppColors.error,
  },
  trialText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
});
