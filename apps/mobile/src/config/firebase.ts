import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = Constants.expoConfig?.extra?.firebase;
if (!firebaseConfig) {
  throw new Error("Firebase configuration is missing in app.json extra.firebase");
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
