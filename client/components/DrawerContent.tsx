import React from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
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
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

function StatusBadge() {
  const { isAuthenticated } = useAuth();
  const { isPastDue, graceDaysRemaining, isLoading, subscription, handleManageSubscription } =
    useSubscription();

  if (isLoading || !isAuthenticated) {
    return null;
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
        style={[styles.statusBadge, styles.pastDueBadge]}
        onPress={handleManageSubscription}
        data-testid="drawer-past-due-badge"
        accessibilityRole="button"
        accessibilityLabel={`Payment status: ${daysText}. Manage subscription`}
      >
        <Feather name="alert-circle" size={12} color="#fff" />
        <ThemedText style={styles.statusText}>{daysText}</ThemedText>
        <Feather name="chevron-right" size={12} color="#fff" />
      </Pressable>
    );
  }

  if (subscription?.cancelAtPeriodEnd) {
    return (
      <Pressable
        style={[styles.statusBadge, styles.cancelingBadge]}
        onPress={handleManageSubscription}
        data-testid="drawer-canceling-badge"
        accessibilityRole="button"
        accessibilityLabel="Subscription ending soon. Manage subscription"
      >
        <Feather name="alert-triangle" size={12} color="#fff" />
        <ThemedText style={styles.statusText}>Ending soon</ThemedText>
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
  const { signOut, isAuthenticated } = useAuth();
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
      label: "Cookware",
      icon: "tool",
      route: "CookwareTab",
      matchTab: "CookwareTab",
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
                contentFit="contain"
                cachePolicy="memory-disk"
                accessibilityElementsHidden={true}
                importantForAccessibility="no-hide-descendants"
              />
              <ThemedText style={styles.appName}>ChefSpAIce</ThemedText>
            </View>
            <ThemedText type="small" style={styles.tagline}>
              Reduce waste, eat fresh
            </ThemedText>
            <StatusBadge />
          </View>

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
          </View>
        </DrawerContentScrollView>

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <View
            style={[styles.divider, { backgroundColor: theme.glass.border }]}
          />
          {isAuthenticated ? (
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
              accessibilityRole="button"
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
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.addItemButton,
                {
                  backgroundColor: `${AppColors.primary}15`,
                  borderWidth: 1,
                  borderColor: `${AppColors.primary}40`,
                },
                pressed ? { opacity: 0.8 } : null,
              ]}
              onPress={() => {
                closeDrawer();
                navigation.navigate("Auth" as any);
              }}
              testID="button-drawer-create-account"
              accessibilityRole="button"
              accessibilityLabel="Create Account"
            >
              <Feather
                name="user-plus"
                size={20}
                color={AppColors.primary}
                style={{ marginRight: Spacing.sm }}
              />
              <ThemedText type="caption" style={{ color: AppColors.primary }}>
                Sign Up / Sign In
              </ThemedText>
            </Pressable>
          )}
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
  statusBadge: {
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
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
});
