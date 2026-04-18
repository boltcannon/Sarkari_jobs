import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { profileStorage, pushApi } from "../api/client";

/**
 * Request push permission, get Expo push token, and register it with the
 * backend. Safe to call multiple times (idempotent).
 *
 * Skipped automatically when running inside Expo Go (SDK 53 removed remote
 * push support from Expo Go — it works fine in development builds and APKs).
 */
export async function registerPushToken(): Promise<void> {
  try {
    // Expo Go doesn't support remote push tokens since SDK 53
    if (Constants.appOwnership === "expo") return;

    // Push tokens are only available on real devices
    if (Platform.OS === "web") return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const profile = await profileStorage.get();
    const categories = profile.preferred_categories ?? [];

    await pushApi.register(token, categories);
  } catch (e) {
    // Non-fatal — user just won't get push notifications
    console.log("Push registration skipped:", e);
  }
}
