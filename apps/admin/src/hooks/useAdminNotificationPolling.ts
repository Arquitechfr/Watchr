import { useEffect, useRef } from "react";
import { useAdminNotificationStore } from "../store/adminNotificationStore";

export function useAdminNotificationPolling() {
  const { fetchUnreadCount, fetchNotifications, dropdownOpen } = useAdminNotificationStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownOpenRef = useRef(dropdownOpen);

  useEffect(() => {
    dropdownOpenRef.current = dropdownOpen;
  }, [dropdownOpen]);

  useEffect(() => {
    fetchUnreadCount();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
        if (dropdownOpenRef.current) {
          fetchNotifications();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
        if (dropdownOpenRef.current) {
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
  }, [fetchUnreadCount, fetchNotifications]);
}
