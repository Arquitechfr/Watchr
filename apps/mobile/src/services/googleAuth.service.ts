import { useState, useCallback } from "react";
import Constants from "expo-constants";
import { log } from "../utils/logger";
import { loginWithGoogle } from "./auth.service";
import { signInWithGoogleWeb } from "./googleAuthWeb.service";

declare const require: (id: string) => { signInWithGoogleNative: () => Promise<string> };

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleAuthState {
  prompt: () => Promise<void>;
  isLoading: boolean;
}

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export function useGoogleAuth(
  onSuccess: (tokens: AuthTokens) => void,
  onError: (error: Error) => void,
): GoogleAuthState {
  const [isLoading, setIsLoading] = useState(false);

  const prompt = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isExpoGo()) {
        log("GoogleAuth", "using web flow (Expo Go)");
        const tokens = await signInWithGoogleWeb();
        onSuccess(tokens);
      } else {
        log("GoogleAuth", "using native flow (dev build)");
        const { signInWithGoogleNative } = require("./googleSignInNative.service");
        const idToken = await signInWithGoogleNative();
        const tokens = await loginWithGoogle(idToken);
        onSuccess(tokens);
      }
    } catch (err) {
      log("GoogleAuth", "error", err);
      onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  return { prompt, isLoading };
}
