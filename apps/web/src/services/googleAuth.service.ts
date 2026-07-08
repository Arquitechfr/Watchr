import { useState, useCallback } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../config/firebase";
import { loginWithGoogle, linkGoogleAccount } from "./auth.service";
import { log } from "../utils/logger";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleAuthState {
  prompt: () => Promise<void>;
  isLoading: boolean;
}

export function useGoogleAuth(
  onSuccess: (tokens: AuthTokens) => void,
  onError: (error: Error) => void,
): GoogleAuthState {
  const [isLoading, setIsLoading] = useState(false);

  const prompt = useCallback(async () => {
    setIsLoading(true);
    try {
      log("GoogleAuth", "using web flow");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const tokens = await loginWithGoogle(idToken);
      onSuccess(tokens);
    } catch (err) {
      log("GoogleAuth", "error", err);
      onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  return { prompt, isLoading };
}

export interface GoogleLinkState {
  prompt: () => Promise<void>;
  isLoading: boolean;
}

export function useGoogleLink(
  onSuccess: () => void,
  onError: (error: Error) => void,
): GoogleLinkState {
  const [isLoading, setIsLoading] = useState(false);

  const prompt = useCallback(async () => {
    setIsLoading(true);
    try {
      log("GoogleLink", "using web flow");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await linkGoogleAccount(idToken);
      onSuccess();
    } catch (err) {
      log("GoogleLink", "error", err);
      onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  return { prompt, isLoading };
}
