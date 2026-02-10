import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { withSuspense } from "@/lib/lazy-screen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

const LazyCookwareScreen = withSuspense(React.lazy(() => import("@/screens/CookwareScreen")));

type CookwareStackParamList = {
  Cookware: undefined;
};

const Stack = createNativeStackNavigator<CookwareStackParamList>();

export default function CookwareStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Cookware"
        component={LazyCookwareScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
