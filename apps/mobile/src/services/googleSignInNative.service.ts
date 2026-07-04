import Constants from "expo-constants";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../config/firebase";
import { log } from "../utils/logger";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  clientId: string;
}

function getWebClientId(): string {
  const config = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
  const clientId = config?.clientId;
  if (!clientId) {
    throw new Error("Missing Google Web client ID in app.json extra.firebase.clientId");
  }
  return clientId;
}

export async function signInWithGoogleNative(): Promise<string> {
  GoogleSignin.configure({
    webClientId: getWebClientId(),
    offlineAccess: false,
  });

  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  const idToken = userInfo.data?.idToken;
  if (!idToken) {
    throw new Error("Google Sign-In failed: no ID token returned");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const firebaseIdToken = await result.user.getIdToken();
  log("GoogleSignInNative", "signed in", { uid: result.user.uid });

  return firebaseIdToken;
}
