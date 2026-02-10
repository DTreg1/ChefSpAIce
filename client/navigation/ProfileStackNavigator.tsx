import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { withSuspense } from "@/lib/lazy-screen";

const LazyProfileScreen = withSuspense(React.lazy(() => import("@/screens/ProfileScreen")));
const LazySettingsScreen = withSuspense(React.lazy(() => import("@/screens/SettingsScreen")));
const LazyAnalyticsScreen = withSuspense(React.lazy(() => import("@/screens/AnalyticsScreen")));
const LazyCookingTermsScreen = withSuspense(React.lazy(() => import("@/screens/CookingTermsScreen")));
const LazyCookwareScreen = withSuspense(React.lazy(() => import("@/screens/CookwareScreen")));
const LazyStorageLocationsScreen = withSuspense(React.lazy(() => import("@/screens/StorageLocationsScreen")));
const LazySubscriptionScreen = withSuspense(React.lazy(() => import("@/screens/SubscriptionScreen")));
const LazyGlassLeafScreen = withSuspense(React.lazy(() => import("@/screens/GlassLeafScreen")));
const LazyPrivacyPolicyScreen = withSuspense(React.lazy(() => import("@/screens/PrivacyPolicyScreen")));
const LazyTermsOfServiceScreen = withSuspense(React.lazy(() => import("@/screens/TermsOfServiceScreen")));
const LazySiriShortcutsGuideScreen = withSuspense(React.lazy(() => import("@/screens/SiriShortcutsGuideScreen")));

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: { scrollTo?: string } | undefined;
  Analytics: undefined;
  CookingTerms: undefined;
  Cookware: undefined;
  StorageLocations: undefined;
  Subscription: undefined;
  GlassLeaf: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  SiriShortcutsGuide: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Profile" component={LazyProfileScreen} />
      <Stack.Screen name="Settings" component={LazySettingsScreen} />
      <Stack.Screen name="Analytics" component={LazyAnalyticsScreen} />
      <Stack.Screen name="CookingTerms" component={LazyCookingTermsScreen} />
      <Stack.Screen name="Cookware" component={LazyCookwareScreen} />
      <Stack.Screen
        name="StorageLocations"
        component={LazyStorageLocationsScreen}
      />
      <Stack.Screen name="Subscription" component={LazySubscriptionScreen} />
      <Stack.Screen name="GlassLeaf" component={LazyGlassLeafScreen} />
      <Stack.Screen name="PrivacyPolicy" component={LazyPrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={LazyTermsOfServiceScreen} />
      <Stack.Screen name="SiriShortcutsGuide" component={LazySiriShortcutsGuideScreen} />
    </Stack.Navigator>
  );
}
