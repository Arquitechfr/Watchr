import crypto from "crypto";
import axios from "axios";
import { env } from "../../config/env.js";
import { setRedisValue, getRedisValue, deleteRedisKey } from "../../lib/redis.js";
import { log, logError } from "../../lib/logger.js";
import { loginWithGoogleUserInfo } from "../../services/auth.service.js";
import { verifyAccessToken } from "../../services/auth.service.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_TTL_SECONDS = 300;
const STATE_KEY_PREFIX = "mcp-google-oauth-state:";

function getMcpGoogleRedirectUri(): string {
  return `${env.PUBLIC_URL}/mcp/auth/google/callback`;
}

export function buildMcpGoogleAuthUrl(state: string): string {
  const redirectUri = getMcpGoogleRedirectUri();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_WEB_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function createMcpGoogleState(consentReturnUrl: string): Promise<string> {
  const state = crypto.randomUUID();
  await setRedisValue(`${STATE_KEY_PREFIX}${state}`, consentReturnUrl, STATE_TTL_SECONDS);
  return state;
}

async function getMcpGoogleState(state: string): Promise<string | null> {
  return getRedisValue(`${STATE_KEY_PREFIX}${state}`);
}

async function cleanupMcpGoogleState(state: string): Promise<void> {
  await deleteRedisKey(`${STATE_KEY_PREFIX}${state}`);
}

interface GoogleTokenResponse {
  id_token: string;
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
}

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

async function exchangeMcpCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const redirectUri = getMcpGoogleRedirectUri();
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
  return response.data;
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function handleMcpGoogleCallback(
  code: string,
  state: string,
): Promise<{ userId: string; consentReturnUrl: string }> {
  const consentReturnUrl = await getMcpGoogleState(state);
  if (!consentReturnUrl) {
    logError("McpGoogleOAuth", "state not found or expired", { state });
    throw new Error("Invalid or expired OAuth state");
  }
  await cleanupMcpGoogleState(state);

  const googleTokens = await exchangeMcpCodeForTokens(code);
  log("McpGoogleOAuth", "exchanged code for tokens");

  const userInfo = await getGoogleUserInfo(googleTokens.access_token);
  log("McpGoogleOAuth", "fetched google user info", { sub: userInfo.sub });

  if (!userInfo.email || !userInfo.email_verified) {
    throw new Error("Google email is not verified");
  }

  const tokens = await loginWithGoogleUserInfo(userInfo.email, "web");
  const decoded = verifyAccessToken(tokens.accessToken);

  return {
    userId: decoded.sub,
    consentReturnUrl,
  };
}
