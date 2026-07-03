import { SupportedLocale } from "../i18n/translations.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      language?: SupportedLocale;
      preferredLanguage?: SupportedLocale;
    }
  }
}

export {};
