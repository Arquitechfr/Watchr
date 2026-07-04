import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { api } from "./api";
import { log } from "../utils/logger";

WebBrowser.maybeCompleteAuthSession();

interface GoogleInitResponse {
  authUrl: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function signInWithGoogleWeb(): Promise<AuthTokens> {
  const appRedirect = makeRedirectUri({ path: "auth" });
  log("GoogleAuthWeb", "appRedirect", { appRedirect });

  const { data } = await api.post<GoogleInitResponse>("/auth/google/init", { appRedirect });
  const { authUrl } = data;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, appRedirect);

  if (result.type !== "success") {
    throw new Error("Google authentication was cancelled");
  }

  const url = new URL(result.url);
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");

  if (!accessToken || !refreshToken) {
    throw new Error("Google authentication failed: missing tokens in redirect");
  }

  log("GoogleAuthWeb", "received tokens");
  return { accessToken, refreshToken };
}
