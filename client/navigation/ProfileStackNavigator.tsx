import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "@/screens/ProfileScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import CookingTermsScreen from "@/screens/CookingTermsScreen";
import CookwareScreen from "@/screens/CookwareScreen";
import DevComponentsScreen from "@/screens/DevComponentsScreen";
import BarcodeTestScreen from "@/screens/BarcodeTestScreen";
import StorageLocationsScreen from "@/screens/StorageLocationsScreen";
import SubscriptionScreen from "@/screens/SubscriptionScreen";
import GlassLeafScreen from "@/screens/GlassLeafScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import TermsOfServiceScreen from "@/screens/TermsOfServiceScreen";

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Analytics: undefined;
  CookingTerms: undefined;
  Cookware: undefined;
  DevComponents: undefined;
  BarcodeTest: undefined;
  StorageLocations: undefined;
  Subscription: undefined;
  GlassLeaf: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="CookingTerms" component={CookingTermsScreen} />
      <Stack.Screen name="Cookware" component={CookwareScreen} />
      {__DEV__ ? (
        <Stack.Screen name="DevComponents" component={DevComponentsScreen} />
      ) : null}
      <Stack.Screen name="BarcodeTest" component={BarcodeTestScreen} />
      <Stack.Screen name="StorageLocations" component={StorageLocationsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="GlassLeaf" component={GlassLeafScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}
