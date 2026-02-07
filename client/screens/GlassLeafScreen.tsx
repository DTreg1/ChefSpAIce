import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { GlassLeaf } from "@/components/GlassLeaf";

export default function GlassLeafScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <GlassLeaf />

      <Pressable
        accessibilityLabel="Go back"
        style={[styles.backButton, { top: insets.top + 16 }]}
        onPress={() => navigation.goBack()}
        data-testid="button-back"
      >
        <View style={styles.backButtonInner}>
          <Feather name="arrow-left" size={24} color="#ffffff" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
});
