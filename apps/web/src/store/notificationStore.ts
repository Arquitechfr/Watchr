import { create } from "zustand";

export interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "watchr:notifications";
const MAX_NOTIFICATIONS = 50;

interface NotificationState {
  notifications: InAppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<InAppNotification, "id" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  hydrate: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const item: InAppNotification = {
      ...notification,
      id: generateId(),
      read: false,
    };
    const notifications = [item, ...get().notifications].slice(0, MAX_NOTIFICATIONS);
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
    persistNotifications(notifications);
  },

  markAsRead: (id) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
    persistNotifications(notifications);
  },

  markAllAsRead: () => {
    const notifications = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications, unreadCount: 0 });
    persistNotifications(notifications);
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
    localStorage.removeItem(STORAGE_KEY);
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const notifications = JSON.parse(raw) as InAppNotification[];
        const unreadCount = notifications.filter((n) => !n.read).length;
        set({ notifications, unreadCount });
      }
    } catch {
      // Ignore parse errors
    }
  },
}));

function persistNotifications(notifications: InAppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Ignore storage errors
  }
}
