import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env.js";
import { setRedisValue, getRedisValue, deleteRedisKey } from "../lib/redis.js";
import { log, logError } from "../lib/logger.js";
import { loginWithFirebase } from "./auth.service.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_TTL_SECONDS = 300;
const STATE_KEY_PREFIX = "google-oauth-state:";

export function buildGoogleAuthUrl(state: string): string {
  const redirectUri = `${env.PUBLIC_URL}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_WEB_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function createOAuthState(
  appRedirect: string,
  signupPlatform?: "ios" | "android" | "web",
  language?: string,
): Promise<string> {
  const state = crypto.randomUUID();
  const stateData = JSON.stringify({ appRedirect, signupPlatform, language });
  await setRedisValue(`${STATE_KEY_PREFIX}${state}`, stateData, STATE_TTL_SECONDS);
  return state;
}

export async function getAppRedirect(state: string): Promise<string | null> {
  return getRedisValue(`${STATE_KEY_PREFIX}${state}`);
}

export async function cleanupOAuthState(state: string): Promise<void> {
  await deleteRedisKey(`${STATE_KEY_PREFIX}${state}`);
}

interface GoogleTokenResponse {
  id_token: string;
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCodeForIdToken(code: string): Promise<string> {
  const redirectUri = `${env.PUBLIC_URL}/api/auth/google/callback`;
  const response = await axios.post<GoogleTokenResponse>(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: env.GOOGLE_WEB_CLIENT_ID,
      client_secret: env.GOOGLE_WEB_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );
  return response.data.id_token;
}

export async function handleGoogleCallback(
  code: string,
  state: string,
): Promise<{ accessToken: string; refreshToken: string; appRedirect: string }> {
  const stateRaw = await getAppRedirect(state);
  if (!stateRaw) {
    logError("GoogleOAuth", "state not found or expired", { state });
    throw new Error("Invalid or expired OAuth state");
  }
  await cleanupOAuthState(state);

  let appRedirect: string;
  let signupPlatform: "ios" | "android" | "web" | undefined;
  let language: string | undefined;
  try {
    const parsed = JSON.parse(stateRaw);
    appRedirect = parsed.appRedirect;
    signupPlatform = parsed.signupPlatform;
    language = parsed.language;
  } catch {
    appRedirect = stateRaw;
  }

  const googleIdToken = await exchangeCodeForIdToken(code);
  log("GoogleOAuth", "exchanged code for id token");

  const tokens = await loginWithFirebase(googleIdToken, signupPlatform, language);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    appRedirect,
  };
}
