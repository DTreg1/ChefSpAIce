import React, { useEffect, useState } from "react";
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
import { offlineMutationQueue } from "@/lib/offline-queue";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";

export function PendingSyncBanner() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [pendingMutations, setPendingMutations] = useState(0);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = offlineMutationQueue.subscribe((count) => {
      setPendingMutations(count);
    });
    return unsubscribe;
  }, []);

  const isOnline = syncState?.isOnline ?? true;
  const pendingChanges = syncState?.pendingChanges ?? 0;
  const isSyncing = syncState?.status === "syncing";
  const totalPending = pendingChanges + pendingMutations;
  const shouldShow = isOnline && totalPending > 0;

  useEffect(() => {
    if (shouldShow) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(-100, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [shouldShow, translateY, opacity]);

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
    if (isSyncing) {
      return `Syncing ${totalPending} change${totalPending !== 1 ? "s" : ""}...`;
    }
    return `${totalPending} change${totalPending !== 1 ? "s" : ""} waiting to sync`;
  };

  const handleSyncNow = () => {
    syncManager.processSyncQueue();
  };

  const content = (
    <View style={styles.content}>
      <Feather
        name="upload-cloud"
        size={14}
        color={AppColors.primary}
        testID="icon-pending-sync"
      />
      <ThemedText
        type="caption"
        style={[styles.text, { color: AppColors.primary }]}
        testID="text-pending-sync-message"
      >
        {getMessage()}
      </ThemedText>
      <Pressable
        onPress={handleSyncNow}
        style={styles.syncButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Sync now"
        testID="button-sync-now"
      >
        <ThemedText type="caption" style={[styles.syncText, { color: AppColors.primary }]}>
          Sync now
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
      accessibilityLiveRegion="polite"
      accessibilityRole="summary"
      accessibilityLabel={`${totalPending} changes pending sync`}
      testID="banner-pending-sync"
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
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  syncButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  syncText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.85,
  },
});
