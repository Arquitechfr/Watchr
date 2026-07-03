import Constants from "expo-constants";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import { useEffect } from "react";
import { auth } from "../config/firebase";
import { log } from "../utils/logger";

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  clientId: string;
}

function getGoogleClientId(): string {
  const config = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
  const clientId = config?.clientId;
  if (!clientId) {
    throw new Error("Missing Google Web client ID in app.json extra.firebase.clientId");
  }
  return clientId;
}

export interface GoogleAuthState {
  prompt: () => Promise<void>;
  isLoading: boolean;
}

export function useGoogleAuthRequest(
  onSuccess: (idToken: string) => void,
  onError: (error: Error) => void,
): GoogleAuthState {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: getGoogleClientId(),
      redirectUri: makeRedirectUri({ scheme: "com.watchr.app" }),
      scopes: ["openid", "profile", "email"],
    },
    GOOGLE_DISCOVERY,
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (!authentication?.accessToken) {
        onError(new Error("Google authentication failed: no access token"));
        return;
      }

      signInWithCredential(auth, GoogleAuthProvider.credential(null, authentication.accessToken))
        .then(async (result) => {
          const idToken = await result.user.getIdToken();
          log("GoogleAuth", "signed in", { uid: result.user.uid });
          onSuccess(idToken);
        })
        .catch((err) => {
          log("GoogleAuth", "sign in error", err);
          onError(err instanceof Error ? err : new Error(String(err)));
        });
    } else if (response?.type === "error") {
      log("GoogleAuth", "auth session error", response.error);
      onError(new Error(response.error?.description || "Google authentication failed"));
    }
  }, [response, onSuccess, onError]);

  return {
    prompt: async () => {
      log("GoogleAuth", "prompt");
      if (!request) {
        onError(new Error("Google auth request is not ready"));
        return;
      }
      await promptAsync();
    },
    isLoading: !request,
  };
}
