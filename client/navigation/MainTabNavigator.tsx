import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import InventoryStackNavigator from "@/navigation/InventoryStackNavigator";
import RecipesStackNavigator from "@/navigation/RecipesStackNavigator";
import MealPlanStackNavigator from "@/navigation/MealPlanStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import CookwareStackNavigator from "@/navigation/CookwareStackNavigator";
import { CustomTabBar } from "@/components/CustomTabBar";
import { useTheme } from "@/hooks/useTheme";
import { AppColors } from "@/constants/theme";

export type MainTabParamList = {
  KitchenTab: undefined;
  RecipesTab: undefined;
  AddTab: undefined;
  MealPlanTab: undefined;
  CookwareTab: undefined;
  SettingsTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function EmptyComponent() {
  return null;
}

export default function MainTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="KitchenTab"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: AppColors.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        sceneStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Tab.Screen
        name="KitchenTab"
        component={InventoryStackNavigator}
        options={{
          title: "Kitchen",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="stove" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CookwareTab"
        component={CookwareStackNavigator}
        options={{
          title: "Cookware",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={EmptyComponent}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="RecipesTab"
        component={RecipesStackNavigator}
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="notebook-heart-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MealPlanTab"
        component={MealPlanStackNavigator}
        options={{
          title: "Meals",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});
