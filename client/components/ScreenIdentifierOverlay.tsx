import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";

interface ScreenIdentifierOverlayProps {
  screenName: string | undefined;
}

export function ScreenIdentifierOverlay({
  screenName,
}: ScreenIdentifierOverlayProps) {
  const [copied, setCopied] = useState(false);

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 10 : 100,
    left: 10,
    zIndex: 9999,
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
});
