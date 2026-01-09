import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import InventoryScreen from "@/screens/InventoryScreen";
import ItemDetailScreen from "@/screens/ItemDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { HeaderSearch } from "@/components/HeaderSearch";
import { HamburgerButton } from "@/components/HamburgerButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { useInventoryExport } from "@/hooks/useInventoryExport";

export type InventoryStackParamList = {
  Inventory: undefined;
  ItemDetail: { itemId?: string };
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

function InventoryHeaderRight() {
  const { theme } = useTheme();
  const { handleExport, exporting } = useInventoryExport();

  return (
    <View style={styles.headerRightContainer}>
      <HeaderSearch screenKey="inventory" placeholder="Search items..." />
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
    </View>
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
          headerTitle: () => <HeaderTitle title="Kitchen" materialIcon="stove" />,
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <InventoryHeaderRight />,
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
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
