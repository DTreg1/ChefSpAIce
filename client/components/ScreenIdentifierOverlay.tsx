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
import { logger } from "@/lib/logger";
import { storage } from "@/lib/storage";
import { syncManager } from "@/lib/sync-manager";
import { queryClient } from "@/lib/query-client";
import { getApiUrl } from "@/lib/query-client";

interface ScreenIdentifierOverlayProps {
  screenName: string | undefined;
}

export function ScreenIdentifierOverlay({
  screenName,
}: ScreenIdentifierOverlayProps) {
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Check environment variable to hide overlay (default: show in dev)
  const showOverlay = process.env.EXPO_PUBLIC_SHOW_DEV_OVERLAY !== "false";
  
  if (!screenName || !showOverlay) return null;

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
        const baseUrl = getApiUrl();
        
        // 1. Delete account from server (removes all user data)
        const authToken = await storage.getAuthToken();
        if (authToken) {
          try {
            const deleteResponse = await fetch(`${baseUrl}/api/auth/delete-account`, {
              method: "DELETE",
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
            });
            if (deleteResponse.ok) {
              logger.log("[Reset] Account deleted from server");
            } else {
              logger.log("[Reset] Could not delete from server, continuing with local reset");
            }
          } catch (err) {
            logger.log("[Reset] Server delete failed, continuing with local reset");
          }
        }

        // 2. Call logout API to clear server-side session cookie
        const logoutUrl = new URL("/api/auth/logout", baseUrl);
        await fetch(logoutUrl.toString(), {
          method: "POST",
          credentials: "include",
        }).catch(() => {
          // Ignore network errors during logout
        });

        // 3. Clear all local storage and caches
        await storage.resetAllStorage();
        await syncManager.clearQueue();
        queryClient.clear();

        logger.log("[Reset] Signed out and cleared all local data");
        
        // 4. Reload the page to show landing/auth screen
        if (Platform.OS === "web") {
          window.location.reload();
        } else {
          Alert.alert("App Reset", "The app has been reset. Please restart to see the landing screen.");
        }
      } catch (err) {
        console.error("Failed to reset:", err);
        if (Platform.OS === "web") {
          window.location.reload();
        } else {
          Alert.alert("Reset Error", "Please restart the app manually.");
        }
      } finally {
        setResetting(false);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Reset app for testing? This will DELETE your account and show the landing page.")) {
        confirmReset();
      }
    } else {
      Alert.alert(
        "Reset App",
        "This will DELETE your account from the server and reset the app. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete & Reset", style: "destructive", onPress: confirmReset },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { pointerEvents: "box-none" }]}>
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
