import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getItem as secureGetItem, setItem as secureSetItem, deleteItem as secureDeleteItem } from "../utils/secureStorage";
import { log } from "../utils/logger";
import { refreshTokens } from "../services/tokenRefreshManager";

const WIDGET_AUTH_TOKEN_KEY = "widget_auth_token";
const WIDGET_REFRESH_TOKEN_KEY = "widget_refresh_token";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function decodeJwtUserId(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return (payload?.sub as string) ?? null;
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp as number | undefined;
  if (!exp) return true;
  return Date.now() >= (exp - 30) * 1000;
}

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export function waitForHydration(): Promise<void> {
  return new Promise((resolve) => {
    const state = useAuthStore.getState();
    if (state.isHydrated) {
      resolve();
      return;
    }
    const unsubscribe = useAuthStore.subscribe((nextState) => {
      if (nextState.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  isHydrated: false,
  isAuthenticated: false,

  setTokens: async (accessToken, refreshToken) => {
    log("AuthStore", "setTokens");
    await secureSetItem("accessToken", accessToken);
    await secureSetItem("refreshToken", refreshToken);
    try {
      await AsyncStorage.setItem(WIDGET_AUTH_TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(WIDGET_REFRESH_TOKEN_KEY, refreshToken);
    } catch { /* ignore */ }
    const userId = decodeJwtUserId(accessToken);
    set({ accessToken, userId, isAuthenticated: true });
    log("AuthStore", "tokens saved");
    const { errorTracker } = await import("../services/errorTracker");
    errorTracker.setUserContext({ userId: userId ?? undefined });
    const { websocketService } = await import("../services/websocket.service");
    websocketService.reconnect();
  },

  logout: async () => {
    const { websocketService } = await import("../services/websocket.service");
    websocketService.disconnect();
    await secureDeleteItem("accessToken");
    await secureDeleteItem("refreshToken");
    try {
      await AsyncStorage.removeItem(WIDGET_AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(WIDGET_REFRESH_TOKEN_KEY);
    } catch { /* ignore */ }
    set({ accessToken: null, userId: null, isAuthenticated: false });
    const { errorTracker } = await import("../services/errorTracker");
    errorTracker.clearUserContext();
  },

  hydrate: async () => {
    log("AuthStore", "hydrate start");
    try {
      const accessToken = await secureGetItem("accessToken");
      const refreshToken = await secureGetItem("refreshToken");

      if (!accessToken || !refreshToken) {
        log("AuthStore", "hydrate done — no tokens");
        set({ accessToken: null, userId: null, isAuthenticated: false, isHydrated: true });
        return;
      }

      let currentAccessToken = accessToken;
      let currentRefreshToken = refreshToken;

      if (isTokenExpired(accessToken)) {
        log("AuthStore", "access token expired, refreshing");
        try {
          const data = await Promise.race([
            refreshTokens(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Refresh timeout")), 5000),
            ),
          ]);
          currentAccessToken = data.accessToken;
          currentRefreshToken = data.refreshToken;
          await secureSetItem("accessToken", currentAccessToken);
          await secureSetItem("refreshToken", currentRefreshToken);
          try {
            await AsyncStorage.setItem(WIDGET_AUTH_TOKEN_KEY, currentAccessToken);
            await AsyncStorage.setItem(WIDGET_REFRESH_TOKEN_KEY, currentRefreshToken);
          } catch { /* ignore */ }
          log("AuthStore", "hydrate refresh success");
        } catch (refreshErr) {
          log("AuthStore", "hydrate refresh failed", refreshErr);
          await secureDeleteItem("accessToken");
          await secureDeleteItem("refreshToken");
          try {
            await AsyncStorage.removeItem(WIDGET_AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(WIDGET_REFRESH_TOKEN_KEY);
          } catch { /* ignore */ }
          set({ accessToken: null, userId: null, isAuthenticated: false, isHydrated: true });
          return;
        }
      }

      const userId = decodeJwtUserId(currentAccessToken);
      log("AuthStore", "hydrate done", { isAuthenticated: true });
      set({ accessToken: currentAccessToken, userId, isAuthenticated: true, isHydrated: true });
      const { errorTracker } = await import("../services/errorTracker");
      errorTracker.setUserContext({ userId: userId ?? undefined });
      const { websocketService } = await import("../services/websocket.service");
      await websocketService.loadLastEventTimestamp();
      websocketService.connect();
    } catch (err) {
      log("AuthStore", "hydrate error", err);
      set({ accessToken: null, userId: null, isAuthenticated: false, isHydrated: true });
    }
  },
}));
