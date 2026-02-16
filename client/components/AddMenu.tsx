import React, {
  useEffect,
  useState,
  useRef,
  memo,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  Modal,
  Alert,
  BackHandler,
} from "react-native";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
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
import { AppColors, Spacing } from "@/constants/theme";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useQuickRecipeGeneration } from "@/hooks/useQuickRecipeGeneration";
import { useOnlineStatus } from "@/hooks/useSyncStatus";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const MENU_COLORS = {
  addItem: AppColors.primary,
  scan: AppColors.accent,
  quickRecipe: AppColors.success,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MenuItemConfig = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
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
    sublabel: "Manual entry",
    color: MENU_COLORS.addItem,
  },
  {
    id: "scan",
    icon: "camera",
    label: "Scan",
    sublabel: "Barcode, label, recipe...",
    color: MENU_COLORS.scan,
  },
  {
    id: "quick-recipe",
    icon: "zap",
    label: "Quick Recipe",
    sublabel: "From your inventory",
    color: MENU_COLORS.quickRecipe,
  },
];

const MenuItem = memo(function MenuItem({
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
  glassColors: { background: string; backgroundStrong: string; backgroundSubtle: string; border: string; borderStrong: string; borderSubtle: string; overlay: string; shadowColor: string; insetHighlight: string };
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
      accessibilityHint={item.sublabel}
      onPress={onPress}
      style={[styles.menuItem, animatedStyle]}
    >
      {renderIconContainer()}
      <Text
        style={[styles.menuItemLabel, { color: textColor }]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {item.sublabel ? (
        <Text
          style={[styles.menuItemSublabel, { color: textColor }]}
          numberOfLines={2}
        >
          {item.sublabel}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
});

type AnimationRefs = {
  progress: SharedValue<number>[];
  scale: SharedValue<number>[];
};

export const AddMenu = memo(function AddMenu({
  isOpen,
  onClose,
  onNavigate,
  tabBarHeight,
}: AddMenuProps) {
  const { isDark, theme, style } = useTheme();
  const overlayOpacity = useSharedValue(0);
  const [shouldRender, setShouldRender] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { focusTargetRef, containerRef, onAccessibilityEscape } = useFocusTrap({
    visible: isOpen,
    onDismiss: onClose,
  });
  const { containerRef: containerRef2, onAccessibilityEscape: onAccessibilityEscape2 } = useFocusTrap({
    visible: showUpgradePrompt,
    onDismiss: () => setShowUpgradePrompt(false),
  });
  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const { checkLimit, entitlements } = useSubscription();
  const { generateQuickRecipe } = useQuickRecipeGeneration();
  const isOnline = useOnlineStatus();

  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const s0 = useSharedValue(0.5);
  const s1 = useSharedValue(0.5);
  const s2 = useSharedValue(0.5);

  const animRefs = useRef<AnimationRefs>({
    progress: [p0, p1, p2],
    scale: [s0, s1, s2],
  });

  const glassColors = style.glass;
  const textColor = theme.text;

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

  useEffect(() => {
    if (!isOpen) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );

    return () => backHandler.remove();
  }, [isOpen, onClose]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleItemPress = useCallback(
    async (itemId: string) => {
      if (itemId === "add-item") {
        const limitCheck = checkLimit("pantryItems");
        if (!limitCheck.allowed) {
          setShowUpgradePrompt(true);
          return;
        }
      }

      if (itemId === "quick-recipe" && !isOnline) {
        Alert.alert("Offline", "This feature is available when online.");
        return;
      }

      onClose();

      setTimeout(async () => {
        switch (itemId) {
          case "add-item":
            onNavigate("AddItem");
            break;
          case "scan":
            onNavigate("ScanHub");
            break;
          case "quick-recipe":
            generateQuickRecipe();
            break;
        }
      }, 250);
    },
    [checkLimit, onClose, onNavigate, generateQuickRecipe, isOnline],
  );

  const handleUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
    onClose();
    setTimeout(() => {
      onNavigate("Pricing");
    }, 250);
  }, [onClose, onNavigate]);

  const handleDismissUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
  }, []);

  const menuItems = useMemo(
    () =>
      MENU_ITEMS.map((item) => ({
        ...item,
        onPress: () => handleItemPress(item.id),
      })),
    [handleItemPress],
  );

  if (!shouldRender) {
    return null;
  }

  const renderOverlayBackground = () => {
    if (useLiquidGlass) {
      return (
        <>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(0, 0, 0, 0.5)"
                  : "rgba(0, 0, 0, 0.4)",
              },
            ]}
          />
          <GlassView
            glassEffectStyle="regular"
            style={StyleSheet.absoluteFill}
          />
        </>
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

  const pantryLimit = checkLimit("pantryItems");
  const remaining =
    typeof pantryLimit.remaining === "number" ? pantryLimit.remaining : 25;
  const max =
    typeof entitlements.maxPantryItems === "number"
      ? entitlements.maxPantryItems
      : 25;

  return (
    <>
      <Animated.View
        style={[
          styles.overlay,
          overlayAnimatedStyle,
          { pointerEvents: isOpen ? "auto" : "none" },
        ]}
      >
        {renderOverlayBackground()}

        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" accessibilityRole="button" />

        <View ref={containerRef} style={[styles.menuContainer, { bottom: tabBarHeight + 20 }]} accessibilityRole="menu" onAccessibilityEscape={onAccessibilityEscape}>
          <View ref={focusTargetRef} style={styles.menuRow}>
            {menuItems.map((item, index) => (
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
        </View>
      </Animated.View>

      <Modal
        visible={showUpgradePrompt}
        transparent
        animationType="fade"
        onRequestClose={handleDismissUpgrade}
        accessibilityViewIsModal={true}
      >
        <View ref={containerRef2} style={styles.upgradeModalOverlay} onAccessibilityEscape={onAccessibilityEscape2}>
          <UpgradePrompt
            type="limit"
            limitName="pantry items"
            remaining={remaining}
            max={max}
            onUpgrade={handleUpgrade}
            onDismiss={handleDismissUpgrade}
          />
        </View>
      </Modal>
    </>
  );
});

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
    width: 100,
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
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  menuItemSublabel: {
    fontSize: 10,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  upgradeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
});
