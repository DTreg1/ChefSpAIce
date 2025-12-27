import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, Text, Platform } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, GlassColors, Colors } from "@/constants/theme";
import { getGenerateRecipeParams } from "@/components/GenerateRecipeButton";

const MENU_COLORS = {
  addItem: AppColors.primary,
  scanBarcode: AppColors.accent,
  aiScan: AppColors.warning,
  ingredientScan: "#9B59B6",
  quickRecipe: AppColors.success,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MenuItemConfig = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
};

type AddMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string, params?: object) => void;
  tabBarHeight: number;
};

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 280,
  mass: 0.8,
};

const MENU_ITEMS: Omit<MenuItemConfig, "onPress">[] = [
  {
    id: "add-item",
    icon: "plus-circle",
    label: "Add Item",
    color: MENU_COLORS.addItem,
  },
  {
    id: "scan-barcode",
    icon: "maximize",
    label: "Scan Barcode",
    color: MENU_COLORS.scanBarcode,
  },
  {
    id: "ai-scan",
    icon: "camera",
    label: "AI Bulk Scan",
    color: MENU_COLORS.aiScan,
  },
  {
    id: "ingredient-scan",
    icon: "file-text",
    label: "Scan Label",
    color: MENU_COLORS.ingredientScan,
  },
  {
    id: "quick-recipe",
    icon: "zap",
    label: "Quick Recipe",
    color: MENU_COLORS.quickRecipe,
  },
];

function MenuItem({
  item,
  onPress,
  progress,
  scale,
  isDark,
  glassColors,
  textColor,
}: {
  item: MenuItemConfig;
  onPress: () => void;
  progress: SharedValue<number>;
  scale: SharedValue<number>;
  isDark: boolean;
  glassColors: typeof GlassColors.dark;
  textColor: string;
}) {
  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 1]);
    const translateY = interpolate(progress.value, [0, 1], [40, 0]);

    return {
      opacity,
      transform: [{ scale: scale.value }, { translateY }],
    };
  });

  const renderIconContainer = () => {
    if (useLiquidGlass) {
      return (
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.menuItemIconContainer,
            {
              borderColor: item.color,
              borderWidth: 1.5,
            },
          ]}
        >
          <Feather name={item.icon} size={24} color={item.color} />
        </GlassView>
      );
    }

    return (
      <View
        style={[
          styles.menuItemIconContainer,
          {
            borderColor: item.color,
            backgroundColor: glassColors.backgroundStrong,
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={20}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Feather name={item.icon} size={24} color={item.color} />
      </View>
    );
  };

  return (
    <AnimatedPressable
      testID={`menu-${item.id}`}
      accessibilityLabel={item.label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.menuItem, animatedStyle]}
    >
      {renderIconContainer()}
      <Text
        style={[styles.menuItemLabel, { color: textColor }]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

type AnimationRefs = {
  progress: SharedValue<number>[];
  scale: SharedValue<number>[];
};

export function AddMenu({
  isOpen,
  onClose,
  onNavigate,
  tabBarHeight,
}: AddMenuProps) {
  const { isDark } = useTheme();
  const overlayOpacity = useSharedValue(0);
  const [shouldRender, setShouldRender] = useState(false);
  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const s0 = useSharedValue(0.5);
  const s1 = useSharedValue(0.5);
  const s2 = useSharedValue(0.5);
  const s3 = useSharedValue(0.5);
  const s4 = useSharedValue(0.5);

  const animRefs = useRef<AnimationRefs>({
    progress: [p0, p1, p2, p3, p4],
    scale: [s0, s1, s2, s3, s4],
  });

  const glassColors = isDark ? GlassColors.dark : GlassColors.light;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      overlayOpacity.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
      });
      animRefs.current.progress.forEach((p, i) => {
        p.value = withDelay(i * 50, withSpring(1, SPRING_CONFIG));
      });
      animRefs.current.scale.forEach((s, i) => {
        s.value = withDelay(
          i * 50,
          withSpring(1, { damping: 15, stiffness: 300 }),
        );
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
      animRefs.current.progress.forEach((p) => {
        p.value = withSpring(0, { damping: 20, stiffness: 400 });
      });
      animRefs.current.scale.forEach((s) => {
        s.value = withSpring(0.5, { damping: 20, stiffness: 400 });
      });
    }
  }, [isOpen]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleItemPress = async (itemId: string) => {
    onClose();

    setTimeout(async () => {
      switch (itemId) {
        case "add-item":
          onNavigate("AddItem");
          break;
        case "scan-barcode":
          onNavigate("BarcodeScanner");
          break;
        case "ai-scan":
          onNavigate("FoodCamera");
          break;
        case "ingredient-scan":
          onNavigate("IngredientScanner");
          break;
        case "quick-recipe":
          const params = await getGenerateRecipeParams();
          onNavigate("RecipesTab", { screen: "GenerateRecipe", params });
          break;
      }
    }, 250);
  };

  const menuItems: MenuItemConfig[] = MENU_ITEMS.map((item) => ({
    ...item,
    onPress: () => handleItemPress(item.id),
  }));

  const topRow = menuItems.slice(0, 3);
  const bottomRow = menuItems.slice(3, 5);

  if (!shouldRender) {
    return null;
  }

  const renderOverlayBackground = () => {
    if (useLiquidGlass) {
      return (
        <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
      );
    }

    if (Platform.OS === "ios") {
      return (
        <BlurView
          intensity={40}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      );
    }

    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? "rgba(0, 0, 0, 0.85)"
              : "rgba(0, 0, 0, 0.7)",
          },
        ]}
      />
    );
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        overlayAnimatedStyle,
        { pointerEvents: isOpen ? "auto" : "none" },
      ]}
    >
      {renderOverlayBackground()}

      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={[styles.menuContainer, { bottom: tabBarHeight + 20 }]}>
        <View style={styles.menuRow}>
          {topRow.map((item, index) => (
            <MenuItem
              key={item.id}
              item={item}
              onPress={item.onPress}
              progress={animRefs.current.progress[index]}
              scale={animRefs.current.scale[index]}
              isDark={isDark}
              glassColors={glassColors}
              textColor={textColor}
            />
          ))}
        </View>
        <View style={styles.menuRow}>
          {bottomRow.map((item, index) => (
            <MenuItem
              key={item.id}
              item={item}
              onPress={item.onPress}
              progress={animRefs.current.progress[index + 3]}
              scale={animRefs.current.scale[index + 3]}
              isDark={isDark}
              glassColors={glassColors}
              textColor={textColor}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 1100,
  },
  menuContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  menuItem: {
    alignItems: "center",
    width: 80,
  },
  menuItemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  menuItemLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16,
  },
});
