import React from "react";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";

import { useTheme } from "@/hooks/useTheme";

export function HamburgerButton() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <HeaderButton
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      testID="button-open-drawer"
      accessibilityLabel="Open menu"
    >
      <Feather name="menu" size={24} color={theme.text} />
    </HeaderButton>
  );
}
