import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SavedScreen from "../screens/SavedScreen";
import TrackerScreen from "../screens/TrackerScreen";
import NoticesScreen from "../screens/NoticesScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import { useTheme } from "../theme/ThemeContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{icon}</Text>;
}

function HomeTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.blue,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBorder,
          height: 58,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Notices"
        component={NoticesScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📄" focused={focused} /> }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="★" focused={focused} /> }}
      />
      <Tab.Screen
        name="Tracker"
        component={TrackerScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();

  const navTheme = {
    ...(theme.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.isDark ? DarkTheme : DefaultTheme).colors,
      background: theme.bg,
      card: theme.header,
      text: theme.text,
      border: theme.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ animation: "slide_from_right", headerShown: false }}>
        <Stack.Screen name="Main" component={HomeTabs} />
        <Stack.Screen
          name="JobDetail"
          component={JobDetailScreen}
          options={{
            headerShown: true,
            title: "Job Details",
            headerTintColor: theme.blue,
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: theme.header },
            headerShadowVisible: true,
            animation: "slide_from_right",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
