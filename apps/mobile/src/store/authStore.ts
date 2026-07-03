import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { log } from "../utils/logger";

function decodeJwtUserId(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    const parsed = JSON.parse(decoded) as { sub?: string };
    return parsed.sub ?? null;
  } catch {
    return null;
  }
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
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({ accessToken: null, userId: null, isAuthenticated: false });
  },

  hydrate: async () => {
    log("AuthStore", "hydrate start");
    try {
      const accessToken = await SecureStore.getItemAsync("accessToken");
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      const isAuthenticated = Boolean(accessToken && refreshToken);
      const userId = accessToken ? decodeJwtUserId(accessToken) : null;
      log("AuthStore", "hydrate done", { isAuthenticated });
      set({
        accessToken,
        userId,
        isAuthenticated,
        isHydrated: true,
      });
    } catch (err) {
      log("AuthStore", "hydrate error", err);
      set({ accessToken: null, userId: null, isAuthenticated: false, isHydrated: true });
    }
  },
}));
