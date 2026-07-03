import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { log } from "../utils/logger";
import { useAuthStore } from "../store/authStore";

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  for (const callback of refreshSubscribers) {
    callback(token);
  }
  refreshSubscribers = [];
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  log("API", "request", { method: config.method, url: config.url });
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    log("API", "response", { status: response.status, url: response.config.url });
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        log("API", "refresh token start");
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data as {
          accessToken: string;
          refreshToken: string;
        };

        useAuthStore.getState().setTokens(accessToken, refreshToken);
        await SecureStore.setItemAsync("refreshToken", newRefreshToken);

        log("API", "refresh token success");
        onTokenRefreshed(accessToken);
        originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        return api(originalRequest);
      } catch (refreshError) {
        log("API", "refresh token failed", refreshError);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response) {
      log("API", "error response", { status: error.response.status, url: error.config?.url });
    } else {
      log("API", "error", { message: error.message, url: error.config?.url });
    }
    return Promise.reject(error);
  },
);

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && Boolean(error.request);
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return "Vérifie ta connexion internet.";
  }
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? "Un problème est survenu.";
  }
  return "Un problème est survenu.";
}
