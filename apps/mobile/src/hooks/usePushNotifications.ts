import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { useThemeColors } from "../theme/useThemeColors";
import { log } from "../utils/logger";
import Constants from "expo-constants";

type NotificationSubscription = import("expo-notifications").Subscription;

export function usePushNotifications() {
  const { isAuthenticated, logout } = useAuthStore();
  const colors = useThemeColors();
  const notificationListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function setup() {
      const Notifications = await import("expo-notifications");

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

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

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: colors.primary,
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

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        log("usePushNotifications", "got push token", { token });
        await registerPushToken(token);
      } catch (err) {
        log("usePushNotifications", "failed to register push token", { err });
      }
    }

    setup();

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
