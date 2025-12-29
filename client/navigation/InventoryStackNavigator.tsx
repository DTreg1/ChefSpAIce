import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import InventoryScreen from "@/screens/InventoryScreen";
import ItemDetailScreen from "@/screens/ItemDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { HamburgerButton } from "@/components/HamburgerButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { useInventoryExport } from "@/hooks/useInventoryExport";
import { Spacing } from "@/constants/theme";

export type InventoryStackParamList = {
  Inventory: undefined;
  ItemDetail: { itemId?: string };
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

function ExportButton() {
  const { theme } = useTheme();
  const { handleExport, exporting } = useInventoryExport();

  return (
    <Pressable
      testID="button-export-inventory"
      onPress={handleExport}
      disabled={exporting}
      style={styles.headerButton}
    >
      <Feather
        name="download"
        size={22}
        color={exporting ? theme.textSecondary : theme.text}
      />
    </Pressable>
  );
}

export default function InventoryStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          headerTitle: () => <HeaderTitle title="ChefSpAIce" />,
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <ExportButton />,
        }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{
          headerTitle: "Item Details",
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
});
