import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CookwareScreen from "@/screens/CookwareScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { HeaderSearch } from "@/components/HeaderSearch";
import { HamburgerButton } from "@/components/HamburgerButton";
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
          headerTitle: () => <HeaderTitle title="Cookware" materialIcon="silverware-fork-knife" />,
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <HeaderSearch screenKey="cookware" placeholder="Search cookware..." />,
        }}
      />
    </Stack.Navigator>
  );
}
