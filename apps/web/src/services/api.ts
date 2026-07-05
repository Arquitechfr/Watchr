import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { useI18n } from "../i18n/useI18n";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4500").replace(/\/+$/, "");

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

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  const locale = useLocaleStore.getState().locale;
  config.headers.set("Accept-Language", locale);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint =
      originalRequest.url?.startsWith("/auth/login") ||
      originalRequest.url?.startsWith("/auth/register") ||
      originalRequest.url?.startsWith("/auth/refresh") ||
      originalRequest.url?.startsWith("/auth/firebase") ||
      originalRequest.url?.startsWith("/auth/forgot-password") ||
      originalRequest.url?.startsWith("/auth/reset-password");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
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
        const refreshToken = localStorage.getItem("refreshToken");
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

        useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        onTokenRefreshed(accessToken);
        originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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

const errorMessageKeys: Record<string, string> = {
  INVALID_CREDENTIALS: "auth.invalidCredentials",
  EMAIL_IN_USE: "auth.emailAlreadyUsed",
  INVALID_REFRESH_TOKEN: "errors.unauthorized",
  RATE_LIMITED: "errors.unknown",
  UNAUTHORIZED: "errors.unauthorized",
};

export function getErrorMessage(
  error: unknown,
  t?: (key: string, options?: Record<string, unknown>) => string,
): string {
  const translate = t ?? ((key: string) => key);
  if (isNetworkError(error)) {
    return translate("auth.networkError");
  }
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: { code?: string; message?: string } } | undefined;
    const code = data?.error?.code;
    if (code && code in errorMessageKeys) {
      return translate(errorMessageKeys[code]);
    }
    return data?.error?.message ?? translate("errors.unknown");
  }
  return translate("errors.unknown");
}

export function useErrorMessage() {
  const { t } = useI18n();
  return (error: unknown) => getErrorMessage(error, t);
}
