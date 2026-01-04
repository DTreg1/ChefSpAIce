import React from "react";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { DrawerContent } from "@/components/DrawerContent";
import { useTheme } from "@/hooks/useTheme";

export type DrawerParamList = {
  Tabs: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  
  // On web with wide screens, use a permanent sidebar
  // On mobile or narrow web screens, use a sliding front drawer
  const isWideWeb = Platform.OS === "web" && width > 768;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isWideWeb ? "permanent" : "front",
        drawerStyle: {
          width: isWideWeb ? 240 : 280,
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : theme.backgroundDefault,
          ...(isWideWeb && {
            borderRightWidth: 0,
          }),
        },
        overlayColor: isWideWeb ? "transparent" : "rgba(0, 0, 0, 0.5)",
        swipeEnabled: !isWideWeb,
        swipeEdgeWidth: 50,
        sceneStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Drawer.Screen name="Tabs" component={MainTabNavigator} />
    </Drawer.Navigator>
  );
}
