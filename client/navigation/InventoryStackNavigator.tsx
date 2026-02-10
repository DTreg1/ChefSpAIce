import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { withSuspense } from "@/lib/lazy-screen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

const LazyInventoryScreen = withSuspense(React.lazy(() => import("@/screens/InventoryScreen")));
const LazyItemDetailScreen = withSuspense(React.lazy(() => import("@/screens/ItemDetailScreen")));

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
        component={LazyInventoryScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={LazyItemDetailScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
