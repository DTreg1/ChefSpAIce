import { StyleSheet, View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ScreenshotGalleryScreenProps {
  onBack?: () => void;
}

export default function ScreenshotGalleryScreen({ onBack }: ScreenshotGalleryScreenProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0A1F0F", "#0F1419", "#0A0F14"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={styles.text}>Screenshot Gallery is only available in development on web.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  text: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
  },
});
