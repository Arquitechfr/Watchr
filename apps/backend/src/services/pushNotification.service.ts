/* eslint-disable no-console */
import axios from "axios";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { NotificationPreferences } from "../models/user.model.js";
import { NotificationLog } from "../models/notificationLog.model.js";
import { PushTicket } from "../models/pushTicket.model.js";
import { translateNotification } from "../i18n/index.js";
import { SupportedLocale, DEFAULT_LOCALE, normalizeLocale } from "../i18n/translations.js";
import { wsEvents } from "../lib/wsEvents.js";
import { logError } from "../lib/logger.js";

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

async function logAutomatedNotification(
  userId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown> | undefined,
  triggeredBy: string,
  locale: SupportedLocale,
): Promise<void> {
  try {
    const tickets = await sendPushBatch([{ to: token, title, body, data, sound: "default" }]);
    const ticket = tickets[0];
    const success = ticket?.status === "ok";

    const notificationLog = await NotificationLog.create({
      type: "automated",
      title,
      body,
      data,
      sentBy: userId,
      targetCount: 1,
      successCount: success ? 1 : 0,
      failureCount: success ? 0 : 1,
      triggeredBy,
      locale,
    });

    await PushTicket.create({
      notificationLogId: notificationLog._id,
      pushToken: token,
      status: ticket?.status ?? "error",
      errorMessage: ticket?.message,
      errorDetails: ticket?.details?.error,
    }).catch((err) => logError("PushService", "failed to save push ticket", err));
  } catch (err) {
    logError("PushService", "logAutomatedNotification failed", err);
  }
}

function getUserLocale(preferredLanguage?: string): SupportedLocale {
  return normalizeLocale(preferredLanguage);
}

type BooleanPrefKey = {
  [K in keyof NotificationPreferences]: NotificationPreferences[K] extends boolean ? K : never;
}[keyof NotificationPreferences];

async function checkPreference(
  userId: string,
  prefKey: BooleanPrefKey,
): Promise<{ allowed: boolean; locale: SupportedLocale; pushToken: string | null }> {
  const user = await User.findById(userId).select("notificationPreferences preferredLanguage expoPushToken").lean();
  if (!user) return { allowed: false, locale: DEFAULT_LOCALE, pushToken: null };
  return {
    allowed: user.notificationPreferences?.[prefKey] ?? true,
    locale: getUserLocale(user.preferredLanguage),
    pushToken: user.expoPushToken ?? null,
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
    const { allowed, locale: userLocale, pushToken } = await checkPreference(parentUserId, "commentReplies");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentReplyTitle", resolvedLocale);
    const body = translateNotification("commentReplyBody", resolvedLocale, { author: replyAuthor, show: showTitle });

    const data = { screen: "comments", showId };

    wsEvents.emit("notification:new", {
      userId: parentUserId,
      notification: { type: "commentReply", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(parentUserId, pushToken, title, body, data, "comment_reply", resolvedLocale);
  },

  async notifyCommentReaction(
    commentOwnerId: string,
    reactorUsername: string,
    emoji: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(commentOwnerId, "commentReactions");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentReactionTitle", resolvedLocale);
    const body = translateNotification("commentReactionBody", resolvedLocale, {
      author: reactorUsername,
      emoji,
      show: showTitle,
    });

    const data = { screen: "comments", showId };

    wsEvents.emit("notification:new", {
      userId: commentOwnerId,
      notification: { type: "commentReaction", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(commentOwnerId, pushToken, title, body, data, "comment_reaction", resolvedLocale);
  },

  async notifyCommentLike(
    commentOwnerId: string,
    likerUsername: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(commentOwnerId, "commentLikes");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentLikeTitle", resolvedLocale);
    const body = translateNotification("commentLikeBody", resolvedLocale, {
      author: likerUsername,
      show: showTitle,
    });

    const data = { screen: "comments", showId };

    wsEvents.emit("notification:new", {
      userId: commentOwnerId,
      notification: { type: "commentLike", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(commentOwnerId, pushToken, title, body, data, "comment_like", resolvedLocale);
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
    const { allowed, locale: userLocale, pushToken } = await checkPreference(userId, "newReleases");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("newEpisodeTitle", resolvedLocale);
    const body = translateNotification("newEpisodeBody", resolvedLocale, {
      show: showTitle,
      season,
      episode,
    });

    const data = { screen: "show", tmdbId, showId, season, episode };

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "newEpisode", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(userId, pushToken, title, body, data, "new_episode", resolvedLocale);
  },

  async notifyNewRelease(
    userId: string,
    showTitle: string,
    showId: string,
    tmdbId: number,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(userId, "newReleases");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("newReleaseTitle", resolvedLocale);
    const body = translateNotification("newReleaseBody", resolvedLocale, { show: showTitle });

    const data = { screen: "show", tmdbId, showId };

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "newRelease", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(userId, pushToken, title, body, data, "new_release", resolvedLocale);
  },

  async notifyCommentDeleted(
    userId: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(userId, "pushEnabled");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentDeletedTitle", resolvedLocale);
    const body = translateNotification("commentDeletedBody", resolvedLocale, { show: showTitle });

    const data = { screen: "comments", showId };

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "commentDeleted", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(userId, pushToken, title, body, data, "comment_deleted", resolvedLocale);
  },

  async notifyCommentHidden(
    userId: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(userId, "pushEnabled");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentHiddenTitle", resolvedLocale);
    const body = translateNotification("commentHiddenBody", resolvedLocale, { show: showTitle });

    const data = { screen: "comments", showId };

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "commentHidden", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(userId, pushToken, title, body, data, "comment_hidden", resolvedLocale);
  },

  async notifyCommentAutoSpoiler(
    userId: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(userId, "pushEnabled");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentAutoSpoilerTitle", resolvedLocale);
    const body = translateNotification("commentAutoSpoilerBody", resolvedLocale, { show: showTitle });

    const data = { screen: "comments", showId };

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "commentAutoSpoiler", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(userId, pushToken, title, body, data, "comment_auto_spoiler", resolvedLocale);
  },

  async notifyCommentAdminSpoiler(
    userId: string,
    showTitle: string,
    showId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(userId, "pushEnabled");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("commentAdminSpoilerTitle", resolvedLocale);
    const body = translateNotification("commentAdminSpoilerBody", resolvedLocale, { show: showTitle });

    const data = { screen: "comments", showId };

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "commentAdminSpoiler", title, body, data, createdAt: new Date().toISOString() },
    });

    await logAutomatedNotification(userId, pushToken, title, body, data, "comment_admin_spoiler", resolvedLocale);
  },
};
