import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassEffect } from "@/constants/theme";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/data/landing-data";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { logger } from "@/lib/logger";
import { useTheme } from "@/hooks/useTheme";
import { getLandingColors } from "./landing-colors";

const DISMISS_KEY = "@chefspaice/download_banner_dismissed";

function StoreBadge({
  store,
  onPress,
  colors,
}: {
  store: "ios" | "android";
  onPress: () => void;
  colors: ReturnType<typeof getLandingColors>;
}) {
  const isIOS = store === "ios";
  return (
    <Pressable
      style={({ pressed }) => [
        styles.storeBadge,
        pressed && styles.badgePressed,
      ]}
      onPress={onPress}
      {...webAccessibilityProps(onPress)}
      data-testid={`button-download-${store}`}
      accessibilityRole="button"
      accessibilityLabel={isIOS ? "Download on the App Store" : "Get it on Google Play"}
    >
      <MaterialCommunityIcons
        name={isIOS ? "apple" : "google-play"}
        size={20}
        color="#FFFFFF"
      />
      <View>
        <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>
          {isIOS ? "Download on the" : "Get it on"}
        </Text>
        <Text style={[styles.badgeStore, { color: colors.textPrimary }]}>
          {isIOS ? "App Store" : "Google Play"}
        </Text>
      </View>
    </Pressable>
  );
}

export function DownloadBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem(DISMISS_KEY) === "true";
    }
    return false;
  });
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const colors = getLandingColors(isDark);
  const isWide = width > 600;

  const handleDismiss = () => {
    setDismissed(true);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "true");
    }
  };

  if (dismissed || Platform.OS !== "web") return null;

  const openStore = (store: "ios" | "android") => {
    const url = store === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch((err) => {
      logger.error("Failed to open store URL:", err);
    });
  };

  return (
    <View style={styles.wrapper} data-testid="banner-download-app">
      <View style={[styles.container, isWide && styles.containerWide]}>
        <View style={[styles.left, isWide && styles.leftWide]}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="cellphone-arrow-down"
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.title, { color: colors.textSecondary }]} data-testid="text-download-title">
              ChefSpAIce is a mobile-first app
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]} data-testid="text-download-subtitle">
              Get the best experience on your phone. Web app coming soon.
            </Text>
          </View>
        </View>

        <View style={[styles.right, isWide && styles.rightWide]}>
          <View style={styles.badges}>
            <StoreBadge store="ios" onPress={() => openStore("ios")} colors={colors} />
            <StoreBadge store="android" onPress={() => openStore("android")} colors={colors} />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissPressed,
          ]}
          onPress={handleDismiss}
          {...webAccessibilityProps(handleDismiss)}
          data-testid="button-dismiss-banner"
          accessibilityRole="button"
          accessibilityLabel="Dismiss download banner"
        >
          <Feather name="x" size={16} color={colors.textHint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(39, 174, 96, 0.25)",
  },
  container: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  containerWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  left: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  leftWide: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(39, 174, 96, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    alignItems: "center",
  },
  rightWide: {
    marginRight: 24,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: GlassEffect.borderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  badgePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  badgeLabel: {
    fontSize: 9,
    lineHeight: 11,
  },
  badgeStore: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  dismissButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  dismissPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
});
