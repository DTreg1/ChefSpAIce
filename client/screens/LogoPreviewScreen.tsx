import { StyleSheet, View } from "react-native";
import AppLogo from "@/components/AppLogo";

export default function LogoPreviewScreen() {
  return (
    <View style={styles.container}>
      <AppLogo />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
