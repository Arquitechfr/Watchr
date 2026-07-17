import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { log } from "../utils/logger";
import { useAuthStore, waitForHydration } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";
import { useI18n } from "../i18n/useI18n";
import { remoteConfigService } from "./remoteConfig";
import { errorTracker } from "./errorTracker";
import { refreshTokens } from "./tokenRefreshManager";

export function getApiBaseUrl(): string {
  return `${remoteConfigService.getConfig().backend_url}/api`;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

remoteConfigService.subscribe((config) => {
  api.defaults.baseURL = `${config.backend_url}/api`;
  errorTracker.setBaseUrl(config.backend_url);
});

const PUBLIC_ENDPOINT_PREFIXES = [
  "/shows/",
  "/news/",
  "/internal/",
];

function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_ENDPOINT_PREFIXES.some((prefix) => url.startsWith(prefix));
}

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

function onTokenRefreshFailed() {
  for (const callback of refreshSubscribers) {
    callback("");
  }
  refreshSubscribers = [];
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  log("API", "request", { method: config.method, url: config.url });
  let token = useAuthStore.getState().accessToken;
  if (!token && !isPublicEndpoint(config.url)) {
    await waitForHydration();
    token = useAuthStore.getState().accessToken;
  }
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  const locale = useLocaleStore.getState().locale;
  config.headers.set("Accept-Language", locale);
  return config;
});

api.interceptors.response.use(
  (response) => {
    log("API", "response", { status: response.status, url: response.config.url });
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip token refresh for auth endpoints
    const isAuthEndpoint = originalRequest.url?.startsWith("/auth/login") ||
                           originalRequest.url?.startsWith("/auth/register") ||
                           originalRequest.url?.startsWith("/auth/refresh") ||
                           originalRequest.url?.startsWith("/auth/firebase");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      // Check for ban/suspend codes on 403 before attempting refresh
      const errData = error.response?.data as { error?: { code?: string } } | undefined;
      const errCode = errData?.error?.code;
      if (errCode === "ACCOUNT_BANNED" || errCode === "ACCOUNT_SUSPENDED") {
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        log("API", "refresh token start");
        const { accessToken, refreshToken: newRefreshToken } = await refreshTokens();

        await useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        log("API", "refresh token success");
        onTokenRefreshed(accessToken);
        originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        return api(originalRequest);
      } catch (refreshError) {
        log("API", "refresh token failed", refreshError);
        onTokenRefreshFailed();
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      const errData = error.response?.data as { error?: { code?: string } } | undefined;
      const errCode = errData?.error?.code;
      if (errCode === "ACCOUNT_BANNED" || errCode === "ACCOUNT_SUSPENDED") {
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    if (error.response) {
      log("API", "error response", { status: error.response.status, url: error.config?.url });
    } else {
      log("API", "error", { message: error.message, url: error.config?.url });
    }

    if (!error.response || error.response.status >= 500) {
      errorTracker.captureException(error, {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
      });
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
  ACCOUNT_BANNED: "auth.accountBanned",
  ACCOUNT_SUSPENDED: "auth.accountSuspended",
  EMAIL_DOMAIN_BLOCKED: "auth.emailDomainBlocked",
  COMMENT_REJECTED_HATE: "screens.comments.rejectedHate",
  COMMENT_REJECTED_HARASSMENT: "screens.comments.rejectedHarassment",
  COMMENT_REJECTED_SPAM: "screens.comments.rejectedSpam",
  COMMENT_REJECTED_SELF_HARM: "screens.comments.rejectedSelfHarm",
  COMMENT_REJECTED_VIOLENCE: "screens.comments.rejectedViolence",
  COMMENT_REJECTED_OTHER: "screens.comments.rejectedOther",
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
