import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { log } from "../utils/logger";

interface AuthState {
  accessToken: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isHydrated: false,
  isAuthenticated: false,

  setTokens: async (accessToken, refreshToken) => {
    log("AuthStore", "setTokens");
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    set({ accessToken, isAuthenticated: true });
    log("AuthStore", "tokens saved");
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({ accessToken: null, isAuthenticated: false });
  },

  hydrate: async () => {
    log("AuthStore", "hydrate start");
    try {
      const accessToken = await SecureStore.getItemAsync("accessToken");
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      const isAuthenticated = Boolean(accessToken && refreshToken);
      log("AuthStore", "hydrate done", { isAuthenticated });
      set({
        accessToken,
        isAuthenticated,
        isHydrated: true,
      });
    } catch (err) {
      log("AuthStore", "hydrate error", err);
      set({ accessToken: null, isAuthenticated: false, isHydrated: true });
    }
  },
}));
