import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { registerPushToken, unregisterPushToken } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { log } from "../utils/logger";

function isStandaloneBuild(): boolean {
  return Constants.executionEnvironment === "standalone";
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated, logout } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function register() {
      if (!isStandaloneBuild()) {
        log("usePushNotifications", "skipped push registration in Expo Go");
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231FDC",
        });
      }

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          log("usePushNotifications", "push permission not granted");
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        log("usePushNotifications", "got push token", { token });
        await registerPushToken(token);
      } catch (err) {
        log("usePushNotifications", "failed to register push token", { err });
      }
    }

    register();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      log("usePushNotifications", "notification received", { notification });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        showId?: string;
        tmdbId?: number;
        season?: number;
        episode?: number;
      };
      log("usePushNotifications", "notification tapped", { data });
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    return () => {
      unregisterPushToken().catch((err) =>
        log("usePushNotifications", "failed to unregister push token", { err }),
      );
    };
  }, [isAuthenticated, logout]);
}
