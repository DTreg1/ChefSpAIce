import React from "react";
import { StyleSheet, Pressable, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BUTTON_SIZE = 66;
const TAB_BAR_HEIGHT = 55;

export function FloatingChatButton() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { isVisible, isChatOpen, openChat, closeChat } = useFloatingChat();
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);


  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
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

  const iconContent = (
    <MaterialCommunityIcons
      name={isChatOpen ? "close" : "chef-hat"}
      size={28}
      color="#FFFFFF"
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
        <View style={styles.buttonInner}>
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
      style={[styles.container, { bottom: bottomPosition, right: Spacing.lg }]}
    >
      <Animated.View style={pulseStyle}>
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.buttonWrapper, animatedStyle]}
        >
          {innerContent}
        </AnimatedPressable>
      </Animated.View>
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
  buttonOverlay: {
    backgroundColor: `${AppColors.primary}CC`,
    borderRadius: BUTTON_SIZE / 2,
  },
});
