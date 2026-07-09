import { Platform } from "react-native";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Firebase configuration is missing in .env (EXPO_PUBLIC_FIREBASE_*)");
}

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  if (Platform.OS === "web") {
    initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    const { getReactNativePersistence } = require("firebase/auth");
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} else {
  app = getApp();
}

export const auth = getAuth(app);
