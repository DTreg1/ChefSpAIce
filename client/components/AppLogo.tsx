import {
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";

const LOGO_SIZE = 240;
const CORNER_RADIUS = 60;
const ICON_SIZE = 175;

function GlassContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.glassIconButton, styles.webGlassEffect]}>
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.18)",
            "rgba(255,255,255,0.06)",
            "rgba(255,255,255,0.12)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  return (
    <GlassView
      glassEffectStyle="regular"
      style={styles.glassIconButton}
    >
      {children}
    </GlassView>
  );
}

export default function AppLogo() {
  return (
    <View style={styles.logoContainer}>
      <GlassContainer>
        <View style={styles.iconShadow}>
          <MaterialCommunityIcons
            name="chef-hat"
            size={ICON_SIZE}
            color="rgba(255, 255, 255, 0.7)"
          />
        </View>
      </GlassContainer>
    </View>
  );
}

export { LOGO_SIZE, CORNER_RADIUS, ICON_SIZE };

const styles = StyleSheet.create({
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  glassIconButton: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: CORNER_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "rgba(0, 0, 0, 0.5)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 25,
  },
  webGlassEffect: {
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
  } as any,
  iconShadow: {
    ...Platform.select({
      web: {
        filter: "drop-shadow(0px 0px 24px rgba(0, 0, 0, 1))",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
    }),
  } as any,
});
