import React from "react";
import { StyleSheet, Pressable, Platform, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { BlurView } from "expo-blur";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing } from "@/constants/theme";

const chefHatLight = require("../assets/images/transparent/chef-hat-light-128.png");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BUTTON_SIZE = 55;
const TAB_BAR_HEIGHT = 55;

export function FloatingChatButton() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { isVisible, isChatOpen, openChat, closeChat } = useFloatingChat();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bottomPadding = Math.max(insets.bottom, 10);
  const bottomPosition = TAB_BAR_HEIGHT + bottomPadding + Spacing.md;

  if (!isVisible) {
    return null;
  }

  const handlePress = () => {
    if (isChatOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const iconContent = isChatOpen ? (
    <Feather name="x" size={28} color="#FFFFFF" />
  ) : (
    <Image
      source={chefHatLight}
      style={{ width: 28, height: 28 }}
      contentFit="contain"
      cachePolicy="memory-disk"
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    />
  );

  const renderInnerContent = () => {
    if (useLiquidGlass) {
      return (
        <GlassView
          glassEffectStyle="regular"
          style={[styles.buttonInner, styles.buttonGlass]}
        >
          {iconContent}
        </GlassView>
      );
    }

    if (Platform.OS === "ios") {
      return (
        <View style={styles.buttonBlurContainer}>
          <BlurView
            intensity={80}
            tint={isDark ? "systemThickMaterialDark" : "systemThickMaterial"}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.buttonOverlay]} />
          {iconContent}
        </View>
      );
    }

    return <View style={styles.buttonInner}>{iconContent}</View>;
  };

  const innerContent = renderInnerContent();

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container,
        { bottom: bottomPosition, right: Spacing.lg },
      ]}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.buttonWrapper, animatedStyle]}
        data-testid="button-floating-chat"
        accessibilityRole="button"
        accessibilityLabel={isChatOpen ? "Close chat assistant" : "Open chat assistant"}
        accessibilityHint={isChatOpen ? "Double-tap to close the AI chat" : "Double-tap to open the AI kitchen assistant"}
        accessibilityState={{ expanded: isChatOpen }}
      >
        {innerContent}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 900,
  },
  buttonWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonInner: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
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
  buttonGlass: {
    backgroundColor: `${AppColors.primary}CC`,
    overflow: "hidden",
  },
  buttonBlurContainer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  buttonOverlay: {
    backgroundColor: `${AppColors.primary}CC`,
    borderRadius: BUTTON_SIZE / 2,
  },
});
