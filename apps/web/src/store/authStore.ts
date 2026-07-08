import { create } from "zustand";
import { websocketService } from "../services/websocket.service";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4500").replace(/\/+$/, "");

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
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
  refreshToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  isAuthenticated: false,
  isHydrated: false,

  setTokens: (accessToken, refreshToken) => {
    const userId = decodeJwtUserId(accessToken);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ accessToken, refreshToken, userId, isAuthenticated: true });
    websocketService.connect();
  },

  logout: () => {
    websocketService.disconnect();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ accessToken: null, refreshToken: null, userId: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken || !refreshToken) {
      set({ accessToken: null, refreshToken: null, userId: null, isAuthenticated: false, isHydrated: true });
      return;
    }

    let currentAccessToken = accessToken;
    let currentRefreshToken = refreshToken;

    if (isTokenExpired(accessToken)) {
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
        localStorage.setItem("accessToken", currentAccessToken);
        localStorage.setItem("refreshToken", currentRefreshToken);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ accessToken: null, refreshToken: null, userId: null, isAuthenticated: false, isHydrated: true });
        return;
      }
    }

    const userId = decodeJwtUserId(currentAccessToken);
    set({ accessToken: currentAccessToken, refreshToken: currentRefreshToken, userId, isAuthenticated: true, isHydrated: true });
    websocketService.connect();
  },
}));
