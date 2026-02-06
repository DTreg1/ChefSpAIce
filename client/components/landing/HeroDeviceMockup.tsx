import { StyleSheet, View, Platform } from "react-native";
import { useEffect } from "react";
import { PhoneFrame } from "./PhoneFrame";
import { heroScreenshot, getShowcaseImageUrl } from "@/data/landing-data";

const isWeb = Platform.OS === "web";

export function HeroDeviceMockup({ isWide }: { isWide: boolean }) {
  const frameWidth = isWide ? 280 : 200;
  const imageUrl = getShowcaseImageUrl(
    heroScreenshot.category,
    heroScreenshot.filename,
  );

  useEffect(() => {
    if (!isWeb) return;
    const styleId = "hero-float-keyframes";
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      @keyframes heroFloat {
        0%, 100% { transform: rotateY(-8deg) rotateX(2deg) translateY(0px); }
        50% { transform: rotateY(-8deg) rotateX(2deg) translateY(-15px); }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

  const floatingStyle: React.CSSProperties = isWeb
    ? {
        animation: "heroFloat 6s ease-in-out infinite",
        transformStyle: "preserve-3d",
        transform: "rotateY(-8deg) rotateX(2deg)",
      }
    : {};

  return (
    <View style={styles.container} data-testid="hero-device-mockup">
      <div style={floatingStyle}>
        <PhoneFrame
          frameWidth={frameWidth}
          imageUrl={imageUrl}
          imageAlt="ChefSpAIce app preview"
          enhancedShadow
        />
      </div>
      <View style={styles.glowEffect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    ...(Platform.OS === "web" ? { filter: "blur(60px)" } : {}),
    zIndex: -1,
  },
});
