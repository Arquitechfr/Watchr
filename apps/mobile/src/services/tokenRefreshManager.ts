import axios from "axios";
import { getItem as secureGetItem } from "../utils/secureStorage";
import { log } from "../utils/logger";
import { remoteConfigService } from "./remoteConfig";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

let currentRefreshPromise: Promise<TokenPair> | null = null;
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const REFRESH_BEFORE_EXPIRY_MS = 60 * 60 * 1000;

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return (decoded.exp as number) ?? null;
  } catch {
    return null;
  }
}

/**
 * Serializes all refresh token requests to prevent race conditions.
 * If a refresh is already in progress, concurrent callers await the same promise
 * instead of firing separate HTTP requests that could race against each other.
 */
export async function refreshTokens(): Promise<TokenPair> {
  if (currentRefreshPromise) {
    log("TokenRefreshManager", "refresh in progress — awaiting existing promise");
    return currentRefreshPromise;
  }

  currentRefreshPromise = doRefresh();

  try {
    return await currentRefreshPromise;
  } finally {
    currentRefreshPromise = null;
  }
}

async function doRefresh(): Promise<TokenPair> {
  log("TokenRefreshManager", "refresh start");
  const refreshToken = await secureGetItem("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const response = await axios.post(`${remoteConfigService.getConfig().backend_url}/api/auth/refresh`, {
    refreshToken,
  });

  const { accessToken, refreshToken: newRefreshToken } = response.data as TokenPair;
  log("TokenRefreshManager", "refresh success");
  return { accessToken, refreshToken: newRefreshToken };
}

export function scheduleProactiveRefresh(accessToken: string): void {
  cancelProactiveRefresh();

  const exp = decodeJwtExp(accessToken);
  if (!exp) return;

  const expiresAtMs = exp * 1000;
  const refreshAtMs = expiresAtMs - REFRESH_BEFORE_EXPIRY_MS;
  const delayMs = refreshAtMs - Date.now();

  if (delayMs <= 0) return;

  log("TokenRefreshManager", "proactive refresh scheduled", {
    inMinutes: Math.round(delayMs / 60000),
  });

  proactiveRefreshTimer = setTimeout(async () => {
    proactiveRefreshTimer = null;
    try {
      log("TokenRefreshManager", "proactive refresh triggered");
      const data = await refreshTokens();
      const { useAuthStore } = await import("../store/authStore");
      await useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    } catch (err) {
      log("TokenRefreshManager", "proactive refresh failed", err);
    }
  }, delayMs);
}

export function cancelProactiveRefresh(): void {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}
