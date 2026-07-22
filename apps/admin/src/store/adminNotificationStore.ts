import { create } from "zustand";
import api from "../lib/api";

export interface FeedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AdminNotificationState {
  notifications: FeedNotification[];
  unreadCount: number;
  loading: boolean;
  dropdownOpen: boolean;
  fetchNotifications: (limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  setDropdownOpen: (open: boolean) => void;
}

export const useAdminNotificationStore = create<AdminNotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  dropdownOpen: false,

  fetchNotifications: async (limit = 10) => {
    set({ loading: true });
    try {
      const { data } = await api.get("/admin/feed-notifications", {
        params: { page: 1, limit },
      });
      set({ notifications: data.notifications, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get("/admin/feed-notifications/unread-count");
      set({ unreadCount: data.count });
    } catch {
      // silent fail
    }
  },

  markAsRead: async (id: string) => {
    const prev = get().notifications;
    set({
      notifications: prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
    try {
      await api.patch(`/admin/feed-notifications/${id}/read`);
    } catch {
      get().fetchUnreadCount();
    }
  },

  markAllAsRead: async () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, readAt: new Date().toISOString() })),
      unreadCount: 0,
    });
    try {
      await api.patch("/admin/feed-notifications/read-all");
    } catch {
      get().fetchUnreadCount();
      get().fetchNotifications();
    }
  },

  deleteNotification: async (id: string) => {
    const prev = get().notifications;
    const target = prev.find((n) => n.id === id);
    set({
      notifications: prev.filter((n) => n.id !== id),
      unreadCount: target && !target.readAt ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
    });
    try {
      await api.delete(`/admin/feed-notifications/${id}`);
    } catch {
      get().fetchNotifications();
    }
  },

  setDropdownOpen: (open: boolean) => set({ dropdownOpen: open }),
}));
