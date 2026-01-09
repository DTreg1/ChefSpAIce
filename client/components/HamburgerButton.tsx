import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";

import { useTheme } from "@/hooks/useTheme";

export function HamburgerButton() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      testID="button-open-drawer"
      accessibilityLabel="Open menu"
      style={styles.button}
    >
      <Feather name="menu" size={24} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
