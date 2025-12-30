import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { storage } from "@/lib/storage";
import { syncManager } from "@/lib/sync-manager";
import { queryClient } from "@/lib/query-client";

interface ScreenIdentifierOverlayProps {
  screenName: string | undefined;
}

export function ScreenIdentifierOverlay({
  screenName,
}: ScreenIdentifierOverlayProps) {
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!screenName) return null;

  const handleCopy = async () => {
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(screenName);
      } else {
        await Clipboard.setStringAsync(screenName);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy screen name:", error);
    }
  };

  const handleReset = async () => {
    const confirmReset = async () => {
      setResetting(true);
      try {
        await storage.resetAllStorage();
        await syncManager.clearQueue();
        queryClient.clear();
        const syncResult = await syncManager.fullSync();
        
        if (syncResult.success) {
          queryClient.invalidateQueries();
          if (Platform.OS === "web") {
            console.log("[Storage] Reset complete, data synced from server");
          } else {
            Alert.alert("Storage Reset", "Data has been refreshed from the server.");
          }
        } else {
          if (Platform.OS === "web") {
            window.location.reload();
          } else {
            Alert.alert("Storage Reset", "Please restart the app to see changes.");
          }
        }
      } catch (err) {
        console.error("Failed to reset storage:", err);
        if (Platform.OS === "web") {
          window.location.reload();
        } else {
          Alert.alert("Storage Reset", "Please restart the app to see changes.");
        }
      } finally {
        setResetting(false);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Reset all local storage? This will sign you out and clear all data.")) {
        confirmReset();
      }
    } else {
      Alert.alert(
        "Reset Storage",
        "This will sign you out and clear all local data. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset", style: "destructive", onPress: confirmReset },
        ]
      );
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.overlay}
        onPress={handleCopy}
        activeOpacity={0.8}
        data-testid="button-copy-screen-name"
      >
        <Text style={styles.label}>Screen:</Text>
        <Text style={styles.screenName}>{screenName}</Text>
        <View style={[styles.copyBadge, copied && styles.copiedBadge]}>
          <Text style={styles.copyText}>{copied ? "Copied!" : "Copy"}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleReset}
        activeOpacity={0.8}
        disabled={resetting}
        data-testid="button-reset-storage"
      >
        <Text style={styles.resetText}>{resetting ? "..." : "Reset"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 10 : 100,
    left: 10,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    maxWidth: 300,
  },
  label: {
    color: "#888",
    fontSize: 11,
    fontWeight: "500",
  },
  screenName: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  copyBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  copiedBadge: {
    backgroundColor: "#166534",
  },
  copyText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
});
