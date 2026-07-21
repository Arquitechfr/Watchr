import { getAdminUserId } from "./autoFollowAdmin.js";
import { createConversation, sendMessage } from "./message.service.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { normalizeLocale, type SupportedLocale } from "../i18n/translations.js";
import { translations } from "../i18n/translations.js";
import { log, logError } from "../lib/logger.js";

async function isWelcomeMessageEnabled(): Promise<boolean> {
  const entry = await MobileConfig.findOne({ key: "welcome_message_enabled" }).lean();
  return entry?.value !== "false";
}

function getWelcomeMessageContent(locale: SupportedLocale): string {
  const pack = (translations as unknown as Record<string, typeof translations.en>)[locale] ?? translations.en;
  return pack.welcomeMessage?.content ?? translations.en.welcomeMessage?.content ?? "Welcome to Watchr!";
}

export async function sendWelcomeMessage(
  newUserId: string,
  locale: string | undefined,
): Promise<void> {
  try {
    const enabled = await isWelcomeMessageEnabled();
    if (!enabled) {
      log("WelcomeMessage", "skipped — feature disabled");
      return;
    }

    const adminId = await getAdminUserId();
    if (!adminId) {
      log("WelcomeMessage", "skipped — no admin user configured");
      return;
    }

    if (adminId === newUserId) {
      return;
    }

    const normalizedLocale = normalizeLocale(locale);
    const content = getWelcomeMessageContent(normalizedLocale);

    const { id: conversationId } = await createConversation(adminId, newUserId, true);
    await sendMessage(conversationId, adminId, content, [], true);

    log("WelcomeMessage", "welcome message sent", { newUserId, locale: normalizedLocale });
  } catch (err) {
    logError("WelcomeMessage", "failed to send welcome message", err, { newUserId });
  }
}
