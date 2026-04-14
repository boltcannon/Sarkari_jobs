import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./src/api/client";
import AppNavigator from "./src/navigation/AppNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";

// NOTE: Push notification registration is disabled in Expo Go (SDK 53+
// removed remote push support from Expo Go). Re-enable in a production
// build by importing expo-notifications and calling registerPushToken().

type AppState = "loading" | "unauthenticated" | "onboarding" | "ready";

export default function App() {
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
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#185FA5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent={false} />
      {appState === "unauthenticated" && <LoginScreen onLogin={() => setAppState("onboarding")} />}
      {appState === "onboarding"      && <OnboardingScreen onComplete={() => setAppState("ready")} />}
      {appState === "ready"           && <AppNavigator />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" },
});
