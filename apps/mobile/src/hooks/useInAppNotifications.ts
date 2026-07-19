import { useEffect, useRef, useCallback } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import { useNotificationStore, type BannerNotification } from "../store/notificationStore";
import { getActiveInAppNotifications, dismissInAppNotification } from "../services/notifications.service";
import { log } from "../utils/logger";

const AUTO_DISMISS_MS = 8000;

export function useInAppNotifications(): void {
  const currentBanner = useNotificationStore((s) => s.currentBanner);
  const bannerShownThisSession = useNotificationStore((s) => s.bannerShownThisSession);
  const dismissedServerIds = useNotificationStore((s) => s.dismissedServerIds);
  const setCurrentBanner = useNotificationStore((s) => s.setCurrentBanner);
  const setBannerShownThisSession = useNotificationStore((s) => s.setBannerShownThisSession);
  const dismissServerId = useNotificationStore((s) => s.dismissServerId);
  const hydrateDismissedIds = useNotificationStore((s) => s.hydrateDismissedIds);

  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  const selectAndShowBanner = useCallback(async () => {
    if (bannerShownThisSession) return;

    try {
      const notifications = await getActiveInAppNotifications();
      if (notifications.length === 0) return;

      const filtered = notifications.filter(
        (n) => !dismissedServerIds.includes(n.id),
      );
      if (filtered.length === 0) return;

      const selected = filtered[0];
      const banner: BannerNotification = {
        serverId: selected.id,
        type: selected.type,
        title: selected.title,
        body: selected.body,
        imageUrl: selected.imageUrl ?? undefined,
        data: selected.data ?? undefined,
        createdAt: selected.createdAt,
      };

      setCurrentBanner(banner);
      setBannerShownThisSession(true);

      autoDismissTimerRef.current = setTimeout(() => {
        setCurrentBanner(null);
      }, AUTO_DISMISS_MS);
    } catch (err) {
      log("useInAppNotifications", "fetch failed", err);
    }
  }, [bannerShownThisSession, dismissedServerIds, setCurrentBanner, setBannerShownThisSession]);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydrateDismissedIds();
      hydratedRef.current = true;
    }
    selectAndShowBanner();

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        setBannerShownThisSession(false);
        selectAndShowBanner();
      } else if (nextState === "background") {
        if (autoDismissTimerRef.current) {
          clearTimeout(autoDismissTimerRef.current);
          autoDismissTimerRef.current = null;
        }
        setCurrentBanner(null);
      }
    });

    return () => {
      subscription.remove();
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [selectAndShowBanner, hydrateDismissedIds, setCurrentBanner, setBannerShownThisSession]);

  const handleManualDismiss = useCallback(
    async (serverId: string) => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
      setCurrentBanner(null);
      dismissServerId(serverId);
      try {
        await dismissInAppNotification(serverId);
      } catch (err) {
        log("useInAppNotifications", "dismiss API failed", err);
      }
    },
    [setCurrentBanner, dismissServerId],
  );

  useEffect(() => {
    if (currentBanner) {
      (useNotificationStore as unknown as { _dismissHandler?: (id: string) => void })._dismissHandler = handleManualDismiss;
    } else {
      delete (useNotificationStore as unknown as { _dismissHandler?: (id: string) => void })._dismissHandler;
    }
  }, [currentBanner, handleManualDismiss]);
}

export function useDismissBanner(): (serverId: string) => void {
  return useCallback((serverId: string) => {
    const handler = (useNotificationStore as unknown as { _dismissHandler?: (id: string) => void })._dismissHandler;
    if (handler) handler(serverId);
  }, []);
}
