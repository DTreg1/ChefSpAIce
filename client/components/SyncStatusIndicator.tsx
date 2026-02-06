import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { Spacing } from "@/constants/theme";

interface SyncStatusIndicatorProps {
  showLabel?: boolean;
  size?: "small" | "medium";
  onPress?: () => void;
}

export function SyncStatusIndicator({
  showLabel = false,
  size = "small",
  onPress,
}: SyncStatusIndicatorProps) {
  const { theme } = useTheme();
  const {
    status,
    isOnline,
    pendingChanges,
    failedItems,
    lastSyncAt,
    fullSync,
    retryFailedItems,
  } = useSyncStatus();

  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (status === "syncing") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [status, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const iconSize = size === "small" ? 16 : 20;
  const containerSize = size === "small" ? 28 : 36;

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: "wifi-off" as const,
        color: theme.warning,
        label: "Offline",
      };
    }

    if (status === "syncing") {
      return {
        icon: "refresh-cw" as const,
        color: theme.primary,
        label: "Syncing...",
      };
    }

    if (status === "error") {
      return {
        icon: "alert-circle" as const,
        color: theme.error,
        label: failedItems > 1 ? `${failedItems} failed` : "1 failed",
      };
    }

    if (pendingChanges > 0) {
      return {
        icon: "upload-cloud" as const,
        color: theme.secondary,
        label: `${pendingChanges} pending`,
      };
    }

    return {
      icon: "check-circle" as const,
      color: theme.success,
      label: "Synced",
    };
  };

  const statusInfo = getStatusInfo();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (status === "error") {
      retryFailedItems();
    } else if (status !== "syncing") {
      fullSync();
    }
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return null;
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSyncAccessibilityLabel = () => {
    if (!isOnline) return "Sync status: Offline";
    if (status === "syncing") return "Sync status: Syncing in progress";
    if (status === "error") return `Sync status: ${failedItems > 1 ? `${failedItems} items failed` : "1 item failed"} to sync`;
    if (pendingChanges > 0) return `Sync status: ${pendingChanges} changes pending`;
    return "Sync status: All data synced";
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={getSyncAccessibilityLabel()}
      accessibilityHint={status === "error" ? "Tap to retry failed items" : "Tap to sync now"}
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: `${statusInfo.color}15`,
          },
          animatedStyle,
        ]}
      >
        {status === "syncing" ? (
          <ActivityIndicator size="small" color={statusInfo.color} />
        ) : (
          <Feather
            name={statusInfo.icon}
            size={iconSize}
            color={statusInfo.color}
          />
        )}
      </Animated.View>

      {showLabel ? (
        <View style={styles.labelContainer}>
          <ThemedText style={[styles.statusLabel, { color: statusInfo.color }]}>
            {statusInfo.label}
          </ThemedText>
          {lastSyncAt && status !== "syncing" ? (
            <ThemedText
              style={[styles.lastSyncLabel, { color: theme.textSecondary }]}
            >
              {formatLastSync()}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    flexDirection: "column",
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  lastSyncLabel: {
    fontSize: 11,
  },
});
