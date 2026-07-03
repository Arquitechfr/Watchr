import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "./env.js";

const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as Record<string, string>;

initializeApp({
  credential: cert(serviceAccount),
});

export const firebaseAuth = getAuth();
