import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InventoryScreen from "@/screens/InventoryScreen";
import ItemDetailScreen from "@/screens/ItemDetailScreen";
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
          headerShown: false,
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
