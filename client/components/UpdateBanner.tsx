/**
 * =============================================================================
 * UPDATE BANNER - OTA Update Notification
 * =============================================================================
 *
 * Displays a banner at the top of the screen when an OTA update is available.
 * Follows the same styling patterns as OfflineIndicator:
 * - Animated slide-in from top using react-native-reanimated
 * - BlurView on iOS, plain View on Android
 * - Safe area aware positioning
 *
 * When forceUpdate is true, the banner cannot be dismissed and shows
 * "Required update available" text.
 *
 * @module components/UpdateBanner
 */

import React, { useEffect } from "react";
import { View, StyleSheet, Platform, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";
import { AnimationDurations } from "@/constants/animations";

interface UpdateBannerProps {
  visible: boolean;
  isDownloading: boolean;
  forceUpdate: boolean;
  onUpdate: () => void;
}

export function UpdateBanner({
  visible,
  isDownloading,
  forceUpdate,
  onUpdate,
}: UpdateBannerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: AnimationDurations.normal });
    } else {
      translateY.value = withSpring(-100, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(0, { duration: AnimationDurations.fast });
    }
  }, [visible, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(
      opacity.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const getMessage = () => {
    if (isDownloading) {
      return "Downloading update...";
    }
    if (forceUpdate) {
      return "Required update available";
    }
    return "New version available";
  };

  const content = (
    <View style={styles.content}>
      {isDownloading ? (
        <ActivityIndicator
          size="small"
          color={theme.primary}
          testID="spinner-update-downloading"
        />
      ) : (
        <Feather
          name="download"
          size={14}
          color={theme.primary}
          testID="icon-update-available"
        />
      )}
      <ThemedText
        type="caption"
        style={[styles.text, { color: theme.text }]}
        testID="text-update-message"
      >
        {getMessage()}
      </ThemedText>
      {!isDownloading && (
        <Pressable
          onPress={onUpdate}
          style={styles.updateButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={forceUpdate ? "Install required update" : "Install update"}
          testID="button-apply-update"
        >
          <ThemedText
            type="caption"
            style={[styles.updateText, { color: theme.primary }]}
          >
            {forceUpdate ? "Update Now" : "Update"}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.xs },
        animatedStyle,
      ]}
      pointerEvents={visible ? "box-none" : "none"}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={
        visible ? getMessage() : undefined
      }
      testID="banner-update"
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint="light" style={styles.blur}>
          {content}
        </BlurView>
      ) : (
        <View
          style={[
            styles.androidBackground,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          {content}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  blur: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  androidBackground: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    opacity: 0.95,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  text: {
    fontSize: Typography.micro.fontSize,
    fontWeight: "500",
    flex: 1,
  },
  updateButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  updateText: {
    fontSize: Typography.micro.fontSize,
    fontWeight: "600",
  },
});
