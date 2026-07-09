import { Platform } from "react-native";
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
  if (Platform.OS === "web") {
    const appRedirect = window.location.origin;
    log("GoogleAuthWeb", "appRedirect (web)", { appRedirect });

    const { data } = await api.post<GoogleInitResponse>("/auth/google/init", { appRedirect });
    window.location.href = data.authUrl;

    return new Promise<AuthTokens>(() => {
      // This promise never resolves on web — the page will redirect to Google,
      // then the backend callback will redirect back to appRedirect with tokens in query params.
      // The auth is handled by the AuthScreen which reads tokens from the URL on load.
    });
  }

  const appRedirect = makeRedirectUri({ path: "auth" });
  log("GoogleAuthWeb", "appRedirect (native)", { appRedirect });

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
