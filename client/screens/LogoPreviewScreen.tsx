import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AppLogo from "@/components/AppLogo";

export default function LogoPreviewScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={StyleSheet.absoluteFill}
      />
      <AppLogo />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
