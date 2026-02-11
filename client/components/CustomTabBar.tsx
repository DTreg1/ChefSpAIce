import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Text,
  LayoutChangeEvent,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { AppColors } from "@/constants/theme";
import { AddMenu } from "./AddMenu";
import { useFloatingChat } from "@/contexts/FloatingChatContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_BAR_HEIGHT = 55;
const TAB_BORDER_RADIUS = 296;
const ICON_SIZE = 22;
const INDICATOR_PADDING = 4;

const COLORS = {
  light: {
    selected: "#0088FF",
    unselected: "#404040",
    selectionBg: "#EDEDED",
    pillBg: "rgba(255, 255, 255, 0.92)",
    pillBorder: "rgba(200, 200, 200, 0.5)",
  },
  dark: {
    selected: "#0A84FF",
    unselected: "#8E8E93",
    selectionBg: "rgba(255, 255, 255, 0.12)",
    pillBg: "rgba(28, 28, 30, 0.95)",
    pillBorder: "rgba(255, 255, 255, 0.1)",
  },
};

interface TabLayout {
  x: number;
  width: number;
}

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { hideFloatingChat, showFloatingChat } = useFloatingChat();
  const { isProUser, usage, entitlements } = useSubscription();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayout>>({});
  const addButtonScale = useSharedValue(1);
  const addButtonRotation = useSharedValue(0);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorScale = useSharedValue(1);
  const colors = isDark ? COLORS.dark : COLORS.light;
  const useLiquidGlass = isLiquidGlassAvailable();

  const maxAiRecipes =
    typeof entitlements.maxAiRecipes === "number"
      ? entitlements.maxAiRecipes
      : 5;
  const remainingAiRecipes = maxAiRecipes - usage.aiRecipesUsedThisMonth;
  const showRecipeBadge = !isProUser && remainingAiRecipes >= 0;

  const hiddenRoutes = [
    "AddTab",
    "ProfileTab",
    "SettingsTab",
    "NotificationsTab",
  ];

  const leftTabs = state.routes.filter((_, i) => i < 2);
  const rightTabs = state.routes.filter(
    (route, i) => i > 2 && !hiddenRoutes.includes(route.name),
  );

  useEffect(() => {
    const currentRoute = state.routes[state.index];
    const layout = tabLayouts[currentRoute.name];
    if (layout && !hiddenRoutes.includes(currentRoute.name)) {
      indicatorX.value = withSpring(layout.x, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      indicatorWidth.value = withSpring(layout.width, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      indicatorScale.value = withSequence(
        withSpring(1.08, { damping: 12, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      );
    }
  }, [state.index, tabLayouts]);

  const handleTabLayout = useCallback(
    (routeName: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => ({
        ...prev,
        [routeName]: { x, width },
      }));
    },
    [],
  );

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorX.value },
      { scaleX: indicatorScale.value },
      { scaleY: indicatorScale.value },
    ],
    width: indicatorWidth.value - INDICATOR_PADDING * 2,
  }));

  const animatedAddButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => {
    const rotate = interpolate(addButtonRotation.value, [0, 1], [0, 45]);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  useEffect(() => {
    if (isMenuOpen) {
      hideFloatingChat();
    } else {
      showFloatingChat();
    }
  }, [isMenuOpen, hideFloatingChat, showFloatingChat]);

  const handleAddPress = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    addButtonRotation.value = withSpring(newState ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
    addButtonRotation.value = withSpring(0, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handleNavigate = (screen: string, params?: object) => {
    (navigation as any).navigate(screen, params);
  };

  const handleAddPressIn = () => {
    addButtonScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handleAddPressOut = () => {
    addButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const renderTab = (
    route: (typeof state.routes)[0],
    index: number,
    isLeftSide: boolean,
  ) => {
    const actualIndex = isLeftSide ? index : index + 3;
    const isFocused = state.index === actualIndex;

    if (hiddenRoutes.includes(route.name)) return null;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const isKitchenTab = route.name === "KitchenTab";
    const isRecipesTab = route.name === "RecipesTab";
    const isCookwareTab = route.name === "CookwareTab";
    const iconName = {
      KitchenTab: "kitchen",
      RecipesTab: "art-track",
      MealPlanTab: "calendar",
      CookwareTab: "blender",
    }[route.name] as string;

    const label =
      {
        KitchenTab: "Kitchen",
        RecipesTab: "Recipes",
        MealPlanTab: "Meals",
        CookwareTab: "Cookware",
      }[route.name] || route.name.replace("Tab", "");

    // Determine badge color for AI recipe remaining indicator
    const getBadgeColor = () => {
      if (remainingAiRecipes <= 0) return AppColors.error;
      if (remainingAiRecipes <= 2) return AppColors.warning;
      return AppColors.success;
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLayout={(e) => handleTabLayout(route.name, e)}
        style={styles.tabButton}
        testID={`tab-${route.name.toLowerCase().replace("tab", "")}`}
        accessibilityRole="tab"
        accessibilityLabel={`${label} tab`}
        accessibilityState={{ selected: isFocused }}
        accessibilityHint={`Navigate to ${label}`}
      >
        <View style={styles.iconWrapper}>
          {isKitchenTab || isCookwareTab || isRecipesTab ? (
            <MaterialIcons
              name={
                isKitchenTab
                  ? "kitchen"
                  : isRecipesTab
                    ? "art-track"
                    : "blender"
              }
              size={ICON_SIZE}
              color={isFocused ? colors.selected : colors.unselected}
              style={styles.tabIcon}
            />
          ) : (
            <Feather
              name={(iconName as keyof typeof Feather.glyphMap) || "circle"}
              size={ICON_SIZE}
              color={isFocused ? colors.selected : colors.unselected}
              style={styles.tabIcon}
            />
          )}
          {isRecipesTab && showRecipeBadge && (
            <View
              style={[styles.recipeBadge, { backgroundColor: getBadgeColor() }]}
            >
              <Text allowFontScaling={false} style={styles.recipeBadgeText}>{remainingAiRecipes}</Text>
            </View>
          )}
        </View>
        <Text
          maxFontSizeMultiplier={1.2}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? colors.selected : colors.unselected,
              fontWeight: isFocused ? "600" : "500",
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderSlidingIndicator = () => {
    const currentRoute = state.routes[state.index];
    if (hiddenRoutes.includes(currentRoute.name)) return null;
    if (Object.keys(tabLayouts).length === 0) return null;

    return (
      <Animated.View
        style={[
          styles.slidingIndicator,
          { backgroundColor: colors.selectionBg },
          animatedIndicatorStyle,
        ]}
      />
    );
  };

  const renderPillBackground = () => {
    // Solid base layer to ensure consistent appearance regardless of screen content
    const baseLayer = (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.pillBlur,
          {
            backgroundColor: isDark
              ? "rgba(28, 28, 30, 0.85)"
              : "rgba(255, 255, 255, 0.85)",
          },
        ]}
      />
    );

    if (useLiquidGlass) {
      return (
        <>
          {baseLayer}
          <GlassView
            glassEffectStyle="regular"
            style={[StyleSheet.absoluteFill, styles.pillBlur]}
          />
        </>
      );
    }

    if (Platform.OS === "ios") {
      return (
        <>
          {baseLayer}
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, styles.pillBlur]}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.pillOverlay,
              {
                backgroundColor: colors.pillBg,
                borderColor: colors.pillBorder,
              },
            ]}
          />
        </>
      );
    }
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.pillBlur,
          {
            backgroundColor: colors.pillBg,
            borderColor: colors.pillBorder,
            borderWidth: 1,
          },
        ]}
      />
    );
  };

  const renderAddButton = () => {
    const iconContent = (
      <Animated.View style={animatedIconStyle}>
        <Feather name="plus" size={28} color="#FFFFFF" />
      </Animated.View>
    );

    const innerContent = useLiquidGlass ? (
      <GlassView
        glassEffectStyle="regular"
        style={[styles.addButtonInner, styles.addButtonGlass]}
      >
        {iconContent}
      </GlassView>
    ) : (
      <View style={styles.addButtonInner}>{iconContent}</View>
    );

    return (
      <AnimatedPressable
        testID="add-button"
        accessibilityLabel={isMenuOpen ? "Close add menu" : "Add new item"}
        accessibilityHint={isMenuOpen ? "Double-tap to close the menu" : "Double-tap to open menu for adding inventory, recipes, or meal plans"}
        accessibilityRole="button"
        accessibilityState={{ expanded: isMenuOpen }}
        onPress={handleAddPress}
        onPressIn={handleAddPressIn}
        onPressOut={handleAddPressOut}
        style={[styles.addButton, animatedAddButtonStyle]}
      >
        {innerContent}
      </AnimatedPressable>
    );
  };

  const bottomPadding = Math.max(insets.bottom, 10);
  const totalTabBarHeight = TAB_BAR_HEIGHT + bottomPadding;

  return (
    <>
      <AddMenu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onNavigate={handleNavigate}
        tabBarHeight={totalTabBarHeight}
      />
      <View style={[styles.container, { paddingBottom: bottomPadding }]}>
        <View style={styles.innerContainer}>
          <View style={styles.pillContainer} accessibilityRole="tabbar">
            {renderPillBackground()}

            <View style={styles.tabsRow}>
              {renderSlidingIndicator()}
              {leftTabs.map((route, index) => renderTab(route, index, true))}
              <View style={styles.addButtonSpacer} />
              {rightTabs.map((route, index) => renderTab(route, index, false))}
            </View>
          </View>
          <View style={styles.addButtonWrapper}>{renderAddButton()}</View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1001,
  },
  innerContainer: {
    width: "100%",
    maxWidth: 500,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  pillContainer: {
    minHeight: TAB_BAR_HEIGHT,
    borderRadius: TAB_BORDER_RADIUS,
    overflow: "hidden",
    width: "100%",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
      },
      ios: {
        shadowColor: "rgba(0,0,0,0.15)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pillBlur: {
    borderRadius: TAB_BORDER_RADIUS,
  },
  pillOverlay: {
    borderRadius: TAB_BORDER_RADIUS,
    borderWidth: 0.5,
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    position: "relative",
  },
  slidingIndicator: {
    position: "absolute",
    top: INDICATOR_PADDING,
    bottom: INDICATOR_PADDING,
    left: INDICATOR_PADDING,
    borderRadius: 100,
    zIndex: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: TAB_BAR_HEIGHT,
    position: "relative",
    zIndex: 1,
  },
  tabIcon: {
    zIndex: 1,
  },
  iconWrapper: {
    position: "relative",
  },
  recipeBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    minHeight: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  recipeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 1,
    textAlign: "center",
    zIndex: 1,
  },
  addButtonSpacer: {
    flex: 1,
  },
  addButtonWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    minHeight: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  addButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0px 2px 4px rgba(39, 174, 96, 0.3)",
      },
      ios: {
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addButtonGlass: {
    backgroundColor: `${AppColors.primary}CC`,
    overflow: "hidden",
  },
});
