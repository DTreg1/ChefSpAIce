import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InventoryScreen from "@/screens/InventoryScreen";
import ItemDetailScreen from "@/screens/ItemDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { HamburgerButton } from "@/components/HamburgerButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type InventoryStackParamList = {
  Inventory: undefined;
  ItemDetail: { itemId?: string };
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

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
