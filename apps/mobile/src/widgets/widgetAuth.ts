import AsyncStorage from "@react-native-async-storage/async-storage";
import { remoteConfigService } from "../services/remoteConfig";
import { getItem as secureGetItem } from "../utils/secureStorage";

const WIDGET_AUTH_TOKEN_KEY = "widget_auth_token";
const WIDGET_REFRESH_TOKEN_KEY = "widget_refresh_token";

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

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp as number | undefined;
  if (!exp) return true;
  return Date.now() >= (exp - 30) * 1000;
}

async function getStoredAccessToken(): Promise<string | null> {
  try {
    const token = await secureGetItem("accessToken");
    if (token) return token;
  } catch {
    // secure storage may not be available in headless task
  }
  try {
    return await AsyncStorage.getItem(WIDGET_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const token = await secureGetItem("refreshToken");
    if (token) return token;
  } catch {
    // secure storage may not be available in headless task
  }
  try {
    return await AsyncStorage.getItem(WIDGET_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function refreshWidgetToken(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  const baseUrl = remoteConfigService.getConfig().backend_url;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    try {
      await AsyncStorage.setItem(WIDGET_AUTH_TOKEN_KEY, data.accessToken);
      await AsyncStorage.setItem(WIDGET_REFRESH_TOKEN_KEY, data.refreshToken);
    } catch {
      // ignore storage errors
    }
    return data.accessToken;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function getValidWidgetToken(): Promise<string | null> {
  const token = await getStoredAccessToken();
  if (!token) return null;

  if (!isTokenExpired(token)) return token;

  return refreshWidgetToken();
}
