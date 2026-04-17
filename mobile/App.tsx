import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./src/api/client";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";

type AppState = "loading" | "unauthenticated" | "onboarding" | "ready";

function AppContent() {
  const { theme } = useTheme();
  const [appState, setAppState] = useState<AppState>("loading");

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) { setAppState("unauthenticated"); return; }
      const onboardingDone = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
      if (!onboardingDone) { setAppState("onboarding"); return; }
      setAppState("ready");
    })();
  }, []);

  if (appState === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.blue} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.statusBar} translucent={false} />
      {appState === "unauthenticated" && <LoginScreen onLogin={() => setAppState("onboarding")} />}
      {appState === "onboarding"      && <OnboardingScreen onComplete={() => setAppState("ready")} />}
      {appState === "ready"           && <AppNavigator />}
    </>
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
