import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "@/screens/ProfileScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import CookingTermsScreen from "@/screens/CookingTermsScreen";
import CookwareScreen from "@/screens/CookwareScreen";
import DevComponentsScreen from "@/screens/DevComponentsScreen";
import BarcodeTestScreen from "@/screens/BarcodeTestScreen";
import DonationScreen from "@/screens/DonationScreen";
import StorageLocationsScreen from "@/screens/StorageLocationsScreen";
import SignInScreen from "@/screens/SignInScreen";
import { HamburgerButton } from "@/components/HamburgerButton";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Analytics: undefined;
  CookingTerms: undefined;
  Cookware: undefined;
  DevComponents: undefined;
  BarcodeTest: undefined;
  Donation: undefined;
  StorageLocations: undefined;
  SignIn: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: "Profile",
          headerLeft: () => <HamburgerButton />,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          headerTitle: "Analytics",
        }}
      />
      <Stack.Screen
        name="CookingTerms"
        component={CookingTermsScreen}
        options={{
          headerTitle: "Cooking Terms",
        }}
      />
      <Stack.Screen
        name="Cookware"
        component={CookwareScreen}
        options={{
          headerTitle: "My Cookware",
        }}
      />
      {__DEV__ ? (
        <Stack.Screen
          name="DevComponents"
          component={DevComponentsScreen}
          options={{
            headerTitle: "Component Library",
          }}
        />
      ) : null}
      <Stack.Screen
        name="BarcodeTest"
        component={BarcodeTestScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Donation"
        component={DonationScreen}
        options={{
          headerTitle: "Support Us",
        }}
      />
      <Stack.Screen
        name="StorageLocations"
        component={StorageLocationsScreen}
        options={{
          headerTitle: "Storage Locations",
        }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{
          headerTitle: "Sign In",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
