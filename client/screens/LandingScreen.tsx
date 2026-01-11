import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";

export default function AppLogo() {
  return (
    <GlassView
      glassEffectStyle="clear"
      isInteractive={true}
      style={styles.glassIconButton}
    >
      <View
        style={{
          filter: "drop-shadow(0px 0px 24px rgba(0, 0, 0, 1))",
        }}
      >
        <MaterialCommunityIcons
          name="chef-hat"
          size={175}
          color="rgba(255, 255, 255, 0.7)"
        />
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  glassIconButton: {
    width: 240,
    height: 240,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "rgba(0, 0, 0, 0.5)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 10,
    shadowRadius: 25,
  },
});
