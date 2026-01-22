import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ThemedText } from "@/components/ThemedText";
import { syncManager, SyncState } from "@/lib/sync-manager";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export function OfflineIndicator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const translateY = useSharedValue(-100);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  // Only show indicator when user is offline (not for pending changes - data saves instantly)
  const shouldShow = syncState && !syncState.isOnline;

  useEffect(() => {
    translateY.value = withSpring(shouldShow ? 0 : -100, {
      damping: 20,
      stiffness: 300,
    });
  }, [shouldShow, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!syncState) return null;

  const isOffline = !syncState.isOnline;
  const hasPending = syncState.pendingChanges > 0;

  const getMessage = () => {
    if (isOffline && hasPending) {
      return `Offline - ${syncState.pendingChanges} change${syncState.pendingChanges > 1 ? "s" : ""} will sync when back online`;
    }
    if (isOffline) {
      return "You're offline";
    }
    return "";
  };

  const getIcon = () => {
    if (isOffline) return "wifi-off";
    if (hasPending) return "refresh-cw";
    return "check";
  };

  const getColor = () => {
    if (isOffline) return "#f59e0b";
    return theme.textSecondary;
  };

  const content = (
    <View style={styles.content}>
      <Feather name={getIcon()} size={14} color={getColor()} />
      <ThemedText
        type="caption"
        style={[styles.text, { color: getColor() }]}
      >
        {getMessage()}
      </ThemedText>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.xs, pointerEvents: "none" },
        animatedStyle,
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint="dark" style={styles.blur}>
          {content}
        </BlurView>
      ) : (
        <View style={[styles.androidBackground, { backgroundColor: theme.backgroundSecondary }]}>
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
  },
});
