import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
  read: boolean;
  imageUrl?: string;
  serverId?: string;
}

export interface BannerNotification {
  serverId: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

const STORAGE_KEY = "watchr:notifications";
const DISMISSED_KEY = "watchr:dismissed-inapp-ids";
const MAX_NOTIFICATIONS = 50;

interface NotificationState {
  notifications: InAppNotification[];
  unreadCount: number;
  currentBanner: BannerNotification | null;
  bannerShownThisSession: boolean;
  dismissedServerIds: string[];
  addNotification: (notification: Omit<InAppNotification, "id" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  hydrate: () => Promise<void>;
  setCurrentBanner: (banner: BannerNotification | null) => void;
  setBannerShownThisSession: (shown: boolean) => void;
  dismissServerId: (serverId: string) => void;
  hydrateDismissedIds: () => Promise<void>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  currentBanner: null,
  bannerShownThisSession: false,
  dismissedServerIds: [],

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
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const notifications = JSON.parse(raw) as InAppNotification[];
        const unreadCount = notifications.filter((n) => !n.read).length;
        set({ notifications, unreadCount });
      }
    } catch {
      // Ignore parse errors
    }
  },

  setCurrentBanner: (banner) => {
    set({ currentBanner: banner });
  },

  setBannerShownThisSession: (shown) => {
    set({ bannerShownThisSession: shown });
  },

  dismissServerId: (serverId) => {
    const dismissedServerIds = [...get().dismissedServerIds, serverId];
    set({ dismissedServerIds });
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedServerIds)).catch(() => {});
  },

  hydrateDismissedIds: async () => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_KEY);
      if (raw) {
        const dismissedServerIds = JSON.parse(raw) as string[];
        set({ dismissedServerIds });
      }
    } catch {
      // Ignore parse errors
    }
  },
}));

async function persistNotifications(notifications: InAppNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Ignore storage errors
  }
}
