import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CookwareScreen from "@/screens/CookwareScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CookwareStackParamList = {
  Cookware: undefined;
};

const Stack = createNativeStackNavigator<CookwareStackParamList>();

export default function CookwareStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Cookware"
        component={CookwareScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
