import { useEffect, useRef } from "react";
import { useAdminNotificationStore } from "../store/adminNotificationStore";

export function useAdminNotificationPolling() {
  const { fetchUnreadCount, fetchNotifications, dropdownOpen } = useAdminNotificationStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchUnreadCount();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
        if (dropdownOpen) {
          fetchNotifications();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
        if (dropdownOpen) {
          fetchNotifications();
        }
      }
    }, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUnreadCount, fetchNotifications, dropdownOpen]);
}
