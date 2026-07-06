import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { log } from "../utils/logger";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4500";

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
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    const userId = decodeJwtUserId(accessToken);
    set({ accessToken, userId, isAuthenticated: true });
    log("AuthStore", "tokens saved");
    const { websocketService } = await import("../services/websocket.service");
    websocketService.reconnect();
  },

  logout: async () => {
    const { websocketService } = await import("../services/websocket.service");
    websocketService.disconnect();
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({ accessToken: null, userId: null, isAuthenticated: false });
  },

  hydrate: async () => {
    log("AuthStore", "hydrate start");
    try {
      const accessToken = await SecureStore.getItemAsync("accessToken");
      const refreshToken = await SecureStore.getItemAsync("refreshToken");

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
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (!response.ok) {
            throw new Error(`Refresh failed: ${response.status}`);
          }
          const data = (await response.json()) as { accessToken: string; refreshToken: string };
          currentAccessToken = data.accessToken;
          currentRefreshToken = data.refreshToken;
          await SecureStore.setItemAsync("accessToken", currentAccessToken);
          await SecureStore.setItemAsync("refreshToken", currentRefreshToken);
          log("AuthStore", "hydrate refresh success");
        } catch (refreshErr) {
          log("AuthStore", "hydrate refresh failed", refreshErr);
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
          set({ accessToken: null, userId: null, isAuthenticated: false, isHydrated: true });
          return;
        }
      }

      const userId = decodeJwtUserId(currentAccessToken);
      log("AuthStore", "hydrate done", { isAuthenticated: true });
      set({ accessToken: currentAccessToken, userId, isAuthenticated: true, isHydrated: true });
      const { websocketService } = await import("../services/websocket.service");
      websocketService.connect();
    } catch (err) {
      log("AuthStore", "hydrate error", err);
      set({ accessToken: null, userId: null, isAuthenticated: false, isHydrated: true });
    }
  },
}));
