import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
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
import { syncManager, SyncState } from "@/lib/sync-manager";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const DISMISS_REAPPEAR_MS = 60_000;

export function OfflineIndicator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  const isOffline = syncState ? !syncState.isOnline : false;
  const hasPending = syncState ? syncState.pendingChanges > 0 : false;

  useEffect(() => {
    if (!isOffline) {
      setDismissed(false);
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    }
  }, [isOffline]);

  const shouldShow = isOffline && !dismissed;

  useEffect(() => {
    if (shouldShow) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(-100, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [shouldShow, translateY, opacity]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    dismissTimer.current = setTimeout(() => {
      setDismissed(false);
      dismissTimer.current = null;
    }, DISMISS_REAPPEAR_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(
      opacity.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  if (!syncState) return null;

  const getMessage = () => {
    if (isOffline && hasPending) {
      return `You're offline \u2022 ${syncState.pendingChanges} change${syncState.pendingChanges > 1 ? "s" : ""} pending`;
    }
    if (isOffline) {
      return "You're offline";
    }
    return "";
  };

  const content = (
    <View style={styles.content}>
      <Feather
        name="wifi-off"
        size={14}
        color="#f59e0b"
        testID="icon-offline-warning"
      />
      <ThemedText
        type="caption"
        style={[styles.text, { color: "#f59e0b" }]}
        testID="text-offline-message"
      >
        {getMessage()}
      </ThemedText>
      <Pressable
        onPress={handleDismiss}
        style={styles.dismissButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss offline notification"
        testID="button-dismiss-offline"
      >
        <ThemedText type="caption" style={styles.dismissText}>
          Dismiss
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.xs },
        animatedStyle,
      ]}
      pointerEvents={shouldShow ? "box-none" : "none"}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      accessibilityLabel={
        isOffline
          ? "You are currently offline. Changes will sync when connection is restored."
          : undefined
      }
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint="dark" style={styles.blur}>
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
    zIndex: 1000,
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
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  dismissButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f59e0b",
    opacity: 0.85,
  },
});
