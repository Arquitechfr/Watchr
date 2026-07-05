import { create } from "zustand";

function decodeJwtUserId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  isAuthenticated: false,

  setTokens: (accessToken, refreshToken) => {
    const userId = decodeJwtUserId(accessToken);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ accessToken, refreshToken, userId, isAuthenticated: true });
    import("../services/websocket.service").then(({ websocketService }) => websocketService.connect());
  },

  logout: () => {
    import("../services/websocket.service").then(({ websocketService }) => websocketService.disconnect());
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ accessToken: null, refreshToken: null, userId: null, isAuthenticated: false });
  },

  hydrate: () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const isAuthenticated = Boolean(accessToken && refreshToken);
    const userId = accessToken ? decodeJwtUserId(accessToken) : null;
    set({ accessToken, refreshToken, userId, isAuthenticated });
    if (isAuthenticated) {
      import("../services/websocket.service").then(({ websocketService }) => websocketService.connect());
    }
  },
}));
