import { SupportedLocale } from "../i18n/translations.js";

interface ApiUser {
  userId: string;
  keyId: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      language?: SupportedLocale;
      preferredLanguage?: SupportedLocale;
      apiUser?: ApiUser;
    }
  }
}

export {};
