import React from "react";
import { View, StyleSheet, Platform, Image, Pressable } from "react-native";
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  AppColors,
  Spacing,
  BorderRadius,
  GlassEffect,
} from "@/constants/theme";

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
    >
      <Feather
        name={icon}
        size={22}
        color={isActive ? AppColors.primary : theme.text}
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
  const { signOut } = useAuth();
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

  const navigateToTab = (tabName: string) => {
    closeDrawer();
    navigation.navigate("Tabs", { screen: tabName });
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
    {
      label: "Profile",
      icon: "user",
      route: "ProfileTab",
      matchTab: "ProfileTab",
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
    <View style={styles.container}>
      {renderBackground()}
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
              source={require("../../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText style={styles.appName}>ChefSpAIce</ThemedText>
          </View>
          <ThemedText type="small" style={styles.tagline}>
            Reduce waste, eat fresh
          </ThemedText>
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
            label="My Cookware"
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
            { backgroundColor: theme.glass.backgroundStrong, borderWidth: 1, borderColor: theme.glass.border },
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
            color={theme.textSecondary}
            style={{ marginRight: Spacing.sm }}
          />
          <ThemedText style={[styles.addItemText, { color: theme.textSecondary }]}>Sign Out</ThemedText>
        </Pressable>
      </View>
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
});
