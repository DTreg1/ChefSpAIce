import {
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";

const LOGO_SIZE = 240;
const DEFAULT_CORNER_RADIUS = 54; // ~22.37% matches iOS app icon squircle
const ICON_SIZE = 175;
// Chef hat glyph is visually centered at (12.5, 11.75) in 24x24 viewBox, not (12, 12)
const ICON_OFFSET_X = -ICON_SIZE * 0.0208; // Shift left to compensate
const ICON_OFFSET_Y = ICON_SIZE * 0.0104;  // Shift down to compensate

interface LiquidGlassContainerProps {
  children: React.ReactNode;
  cornerRadius?: number;
}

function LiquidGlassContainer({ children, cornerRadius = DEFAULT_CORNER_RADIUS }: LiquidGlassContainerProps) {
  const dynamicContainerStyle = {
    borderRadius: cornerRadius,
  };
  const dynamicSpecularStyle = {
    borderTopLeftRadius: cornerRadius,
    borderTopRightRadius: cornerRadius,
  };
  const dynamicInnerGlowStyle = {
    borderRadius: cornerRadius,
  };
  const dynamicEdgeStyle = {
    borderRadius: cornerRadius,
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.glassContainer, styles.webGlassContainer, styles.greenBackground, dynamicContainerStyle]}>
        {/* Glass overlay gradient - subtle tint on top of green */}
        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0.30)",
            "rgba(255, 255, 255, 0.10)",
            "rgba(255, 255, 255, 0.15)",
          ]}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Inner glow / light refraction layer */}
        <View style={[StyleSheet.absoluteFill, styles.webInnerGlow, dynamicInnerGlowStyle]} />
        
        {/* Top specular highlight - the key liquid glass feature */}
        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0.5)",
            "rgba(255, 255, 255, 0.2)",
            "rgba(255, 255, 255, 0)",
          ]}
          locations={[0, 0.25, 0.5]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.specularHighlight, dynamicSpecularStyle]}
        />
        
        {/* Edge highlight for glass border refraction effect */}
        <View style={[styles.edgeHighlight, dynamicEdgeStyle]} />
        
        {children}
      </View>
    );
  }

  // Native iOS/Android implementation with green background + glass overlay
  return (
    <View style={[styles.glassContainer, styles.greenBackground, dynamicContainerStyle]}>
      {/* Glass overlay gradient */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 0.35)",
          "rgba(255, 255, 255, 0.12)",
          "rgba(255, 255, 255, 0.18)",
        ]}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Top specular highlight overlay */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 0.7)",
          "rgba(255, 255, 255, 0.3)",
          "rgba(255, 255, 255, 0)",
        ]}
        locations={[0, 0.25, 0.45]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.specularHighlight, dynamicSpecularStyle]}
      />
      
      {/* Edge highlight for native */}
      <View style={[styles.nativeEdgeHighlight, dynamicEdgeStyle]} />
      
      {children}
    </View>
  );
}

interface AppLogoProps {
  cornerRadius?: number;
}

export default function AppLogo({ cornerRadius = DEFAULT_CORNER_RADIUS }: AppLogoProps) {
  return (
    <View style={styles.logoWrapper}>
      {/* Outer glow/ambient shadow */}
      <View style={[styles.outerGlow, { borderRadius: cornerRadius + 4 }]}>
        <LiquidGlassContainer cornerRadius={cornerRadius}>
          {/* Raised icon with shadow for depth */}
          <View style={styles.iconWrapper}>
            {/* Icon shadow layer for "raised" effect */}
            <View style={styles.iconShadowLayer}>
              <MaterialCommunityIcons
                name="chef-hat"
                size={ICON_SIZE}
                color="rgba(0, 0, 0, 0.4)"
              />
            </View>
            {/* Main icon */}
            <View style={styles.iconMainLayer}>
              <MaterialCommunityIcons
                name="chef-hat"
                size={ICON_SIZE}
                color="rgba(255, 255, 255, 0.85)"
              />
            </View>
          </View>
        </LiquidGlassContainer>
      </View>
    </View>
  );
}

export { LOGO_SIZE, DEFAULT_CORNER_RADIUS as CORNER_RADIUS, ICON_SIZE };

const styles = StyleSheet.create({
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerGlow: {
    borderRadius: DEFAULT_CORNER_RADIUS + 4,
    ...Platform.select({
      web: {
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 12px 24px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.5,
        shadowRadius: 50,
        elevation: 25,
      },
    }),
  } as any,
  glassContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: DEFAULT_CORNER_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  webGlassContainer: {
    position: "relative",
  } as any,
  greenBackground: {
    backgroundColor: "#1a2e05",
  },
  webInnerGlow: {
    boxShadow: "inset 0 0 60px 10px rgba(255, 255, 255, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.4)",
    borderRadius: DEFAULT_CORNER_RADIUS,
  } as any,
  specularHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: LOGO_SIZE * 0.5,
    borderTopLeftRadius: DEFAULT_CORNER_RADIUS,
    borderTopRightRadius: DEFAULT_CORNER_RADIUS,
  },
  edgeHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: DEFAULT_CORNER_RADIUS,
    borderWidth: 1,
    borderColor: "transparent",
  } as any,
  nativeEdgeHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: DEFAULT_CORNER_RADIUS - 1,
    borderWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.5)",
    borderLeftColor: "rgba(255, 255, 255, 0.3)",
    borderRightColor: "rgba(255, 255, 255, 0.2)",
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
  },
  iconWrapper: {
    position: "relative",
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconShadowLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    transform: [
      { translateX: ICON_OFFSET_X },
      { translateY: ICON_OFFSET_Y + 4 }, // +4 for shadow offset
    ],
    ...Platform.select({
      web: {
        filter: "blur(8px)",
      },
      default: {},
    }),
  } as any,
  iconMainLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    transform: [
      { translateX: ICON_OFFSET_X },
      { translateY: ICON_OFFSET_Y },
    ],
    ...Platform.select({
      web: {
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3)) drop-shadow(0 0 20px rgba(255,255,255,0.2))",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  } as any,
});
