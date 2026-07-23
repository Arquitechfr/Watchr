import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useI18n } from "../i18n/useI18n";
import { useUIStore } from "../store/uiStore";
import { log } from "../utils/logger";

export function useInAppUpdates(isAuthenticated: boolean) {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!isAuthenticated) return;
    if (__DEV__ || Platform.OS === "web") return;

    let cancelledUnsubscribe: (() => void) | null = null;
    let updateCheckTimer: ReturnType<typeof setTimeout> | undefined;

    const checkForUpdates = async () => {
      try {
        const ExpoInAppUpdates = await import("expo-in-app-updates");

        if (Platform.OS === "android") {
          cancelledUnsubscribe = ExpoInAppUpdates.addUpdateListener(
            "updateCancelled",
            () => {
              log("InAppUpdates", "update cancelled by user");
              useUIStore.getState().showAlert({
                title: tRef.current("updates.title"),
                message: tRef.current("updates.degradedWarning"),
                buttons: [{ text: tRef.current("updates.ok") }],
              });
            },
          );
        }

        const result = await ExpoInAppUpdates.checkForUpdate();

        if (!result.updateAvailable) {
          log("InAppUpdates", "no update available");
          return;
        }

        log("InAppUpdates", "update available", { storeVersion: result.storeVersion });

        if (Platform.OS === "android") {
          try {
            await ExpoInAppUpdates.startUpdate(false);
          } catch (updateErr) {
            log("InAppUpdates", "failed to start update", updateErr);
          }
        } else {
          useUIStore.getState().showAlert({
            title: tRef.current("updates.title"),
            message: `${tRef.current("updates.message")}\n\n${tRef.current("updates.degradedWarning")}`,
            buttons: [
              {
                text: tRef.current("updates.updateNow"),
                style: "default",
                onPress: async () => {
                  try {
                    await ExpoInAppUpdates.startUpdate();
                  } catch (err) {
                    log("InAppUpdates", "failed to start update", err);
                  }
                },
              },
              {
                text: tRef.current("updates.later"),
                style: "cancel",
              },
            ],
          });
        }
      } catch (err) {
        log("InAppUpdates", "update check failed", err);
      }
    };

    updateCheckTimer = setTimeout(() => {
      checkForUpdates();
    }, 2000);

    return () => {
      if (updateCheckTimer) clearTimeout(updateCheckTimer);
      cancelledUnsubscribe?.();
    };
  }, [isAuthenticated]);
}
