import axios from "axios";
import { getItem as secureGetItem } from "../utils/secureStorage";
import { log } from "../utils/logger";
import { remoteConfigService } from "./remoteConfig";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

let currentRefreshPromise: Promise<TokenPair> | null = null;

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
