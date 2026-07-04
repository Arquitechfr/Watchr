/* eslint-disable no-console */
import axios from "axios";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { NotificationPreferences } from "../models/user.model.js";
import { translateNotification } from "../i18n/index.js";
import { SupportedLocale, DEFAULT_LOCALE } from "../i18n/translations.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function sendPushBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (!env.EXPO_ACCESS_TOKEN) {
    console.warn("[PushService] EXPO_ACCESS_TOKEN not configured — skipping push send");
    return [];
  }

  try {
    const response = await axios.post<{ data: ExpoPushTicket[] }>(
      EXPO_PUSH_URL,
      messages,
      {
        headers: {
          Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );
    return response.data.data ?? [];
  } catch (err) {
    console.error("[PushService] Failed to send push batch:", err);
    return [];
  }
}

async function cleanupInvalidTokens(tickets: ExpoPushTicket[], tokens: string[]): Promise<void> {
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const token = tokens[i];
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      console.log(`[PushService] Cleaning up invalid token for user`);
      await User.updateOne({ expoPushToken: token }, { $unset: { expoPushToken: "" } }).catch(
        (err) => console.error("[PushService] Failed to cleanup token:", err),
      );
    }
  }
}

async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const tickets = await sendPushBatch([{ to: token, title, body, data, sound: "default" }]);
  await cleanupInvalidTokens(tickets, [token]);
}

async function sendToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const user = await User.findById(userId).select("expoPushToken notificationPreferences preferredLanguage").lean();
  if (!user?.expoPushToken) return;
  if (!user.notificationPreferences?.pushEnabled) return;

  await sendPush(user.expoPushToken, title, body, data);
}

function getUserLocale(preferredLanguage?: string): SupportedLocale {
  if (!preferredLanguage) return DEFAULT_LOCALE;
  const base = preferredLanguage.split("-")[0].toLowerCase();
  return (base === "fr" || base === "en") ? base as SupportedLocale : DEFAULT_LOCALE;
}

async function checkPreference(
  userId: string,
  prefKey: keyof NotificationPreferences,
): Promise<{ allowed: boolean; locale: SupportedLocale }> {
  const user = await User.findById(userId).select("notificationPreferences preferredLanguage").lean();
  if (!user) return { allowed: false, locale: DEFAULT_LOCALE };
  return {
    allowed: user.notificationPreferences?.[prefKey] ?? true,
    locale: getUserLocale(user.preferredLanguage),
  };
}

export const PushNotificationService = {
  sendPush,
  sendPushBatch,
  sendToUser,

  async notifyCommentReply(
    parentUserId: string,
    replyAuthor: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale } = await checkPreference(parentUserId, "commentReplies");
    if (!allowed) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentReplyTitle", resolvedLocale);
    const body = translateNotification("commentReplyBody", resolvedLocale, { author: replyAuthor, show: showTitle });

    await sendToUser(parentUserId, title, body, {
      screen: "comments",
      showId,
    });
  },

  async notifyCommentReaction(
    commentOwnerId: string,
    reactorUsername: string,
    emoji: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale } = await checkPreference(commentOwnerId, "commentReactions");
    if (!allowed) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentReactionTitle", resolvedLocale);
    const body = translateNotification("commentReactionBody", resolvedLocale, {
      author: reactorUsername,
      emoji,
      show: showTitle,
    });

    await sendToUser(commentOwnerId, title, body, {
      screen: "comments",
      showId,
    });
  },

  async notifyCommentLike(
    commentOwnerId: string,
    likerUsername: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale } = await checkPreference(commentOwnerId, "commentLikes");
    if (!allowed) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentLikeTitle", resolvedLocale);
    const body = translateNotification("commentLikeBody", resolvedLocale, {
      author: likerUsername,
      show: showTitle,
    });

    await sendToUser(commentOwnerId, title, body, {
      screen: "comments",
      showId,
    });
  },

  async notifyNewEpisode(
    userId: string,
    showTitle: string,
    season: number,
    episode: number,
    showId: string,
    tmdbId: number,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale } = await checkPreference(userId, "newReleases");
    if (!allowed) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("newEpisodeTitle", resolvedLocale);
    const body = translateNotification("newEpisodeBody", resolvedLocale, {
      show: showTitle,
      season,
      episode,
    });

    await sendToUser(userId, title, body, {
      screen: "show",
      tmdbId,
      showId,
      season,
      episode,
    });
  },

  async notifyNewRelease(
    userId: string,
    showTitle: string,
    showId: string,
    tmdbId: number,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale } = await checkPreference(userId, "newReleases");
    if (!allowed) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("newReleaseTitle", resolvedLocale);
    const body = translateNotification("newReleaseBody", resolvedLocale, { show: showTitle });

    await sendToUser(userId, title, body, {
      screen: "show",
      tmdbId,
      showId,
    });
  },
};
