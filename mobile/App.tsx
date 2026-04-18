import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { STORAGE_KEYS } from "./src/api/client";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { AuthContext } from "./src/context/AuthContext";
import { registerPushToken } from "./src/utils/notifications";
import AppNavigator from "./src/navigation/AppNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";

// ── Show notifications when app is in the foreground ─────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type AppState = "loading" | "unauthenticated" | "onboarding" | "ready";

// ── Inner component (needs ThemeProvider above it) ────────────────────────────
function AppContent() {
  const { theme } = useTheme();
  const [appState, setAppState] = useState<AppState>("loading");

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) { setAppState("unauthenticated"); return; }
    const onboardingDone = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
    if (!onboardingDone) { setAppState("onboarding"); return; }
    setAppState("ready");
  };

  useEffect(() => { checkAuth(); }, []);

  // Register for push notifications once user is fully onboarded
  useEffect(() => {
    if (appState === "ready") {
      registerPushToken();
    }
  }, [appState]);

  const logout = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.ONBOARDING_DONE]);
    setAppState("unauthenticated");
  };

  if (appState === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.blue} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ logout }}>
      <StatusBar style={theme.statusBar} translucent={false} />
      {appState === "unauthenticated" && <LoginScreen onLogin={() => setAppState("onboarding")} />}
      {appState === "onboarding"      && <OnboardingScreen onComplete={() => setAppState("ready")} />}
      {appState === "ready"           && <AppNavigator />}
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
