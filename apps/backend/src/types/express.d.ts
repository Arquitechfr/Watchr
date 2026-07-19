import { SupportedLocale } from "../i18n/translations.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

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
      cookies?: Record<string, string>;
      auth?: AuthInfo;
    }
  }
}

export {};
