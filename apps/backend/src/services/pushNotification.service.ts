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
import { personalizePushContent } from "./aiPushPersonalization.service.js";
import { createAutomatedInAppNotification } from "./inAppNotification.service.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  richContent?: { image: string };
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
  richContent?: { image: string },
): Promise<boolean> {
  const message: ExpoPushMessage = { to: token, title, body, data, sound: "default" };
  if (richContent?.image) {
    message.richContent = richContent;
  }
  const tickets = await sendPushBatch([message]);
  if (tickets.length === 0) return false;
  await cleanupInvalidTokens(tickets, [token]);
  return tickets[0]?.status === "ok";
}

async function sendToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  triggeredBy?: string,
): Promise<boolean> {
  const user = await User.findById(userId).select("expoPushToken notificationPreferences preferredLanguage").lean();
  if (!user?.expoPushToken) return false;
  if (!user.notificationPreferences?.pushEnabled) return false;

  const locale = getUserLocale(user.preferredLanguage);
  await logAutomatedNotification(
    userId,
    user.expoPushToken,
    title,
    body,
    data,
    triggeredBy ?? "reengagement",
    locale,
  );
  return true;
}

async function logAutomatedNotification(
  userId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown> | undefined,
  triggeredBy: string,
  locale: SupportedLocale,
  richContent?: { image: string },
): Promise<void> {
  try {
    const message: ExpoPushMessage = { to: token, title, body, data, sound: "default" };
    if (richContent?.image) {
      message.richContent = richContent;
    }
    const tickets = await sendPushBatch([message]);
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

    await createAutomatedInAppNotification({ type: "comment_reply", userId: parentUserId, title, body, data });
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

    await createAutomatedInAppNotification({ type: "comment_reaction", userId: commentOwnerId, title, body, data });
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

    await createAutomatedInAppNotification({ type: "comment_like", userId: commentOwnerId, title, body, data });
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
    posterUrl?: string,
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

    const personalized = await personalizePushContent(
      userId,
      title,
      body,
      { type: "new_episode", showTitle, season, episode },
      resolvedLocale,
    );

    const data = { screen: "show", tmdbId, showId, season, episode };
    const richContent = posterUrl ? { image: posterUrl } : undefined;

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "newEpisode", title: personalized.title, body: personalized.body, data, imageUrl: posterUrl, createdAt: new Date().toISOString() },
    });

    await createAutomatedInAppNotification({ type: "new_episode", userId, title: personalized.title, body: personalized.body, imageUrl: posterUrl, data });
    await logAutomatedNotification(userId, pushToken, personalized.title, personalized.body, data, "new_episode", resolvedLocale, richContent);
  },

  async notifyNewRelease(
    userId: string,
    showTitle: string,
    showId: string,
    tmdbId: number,
    locale: SupportedLocale | string | undefined,
    posterUrl?: string,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(userId, "newReleases");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("newReleaseTitle", resolvedLocale);
    const body = translateNotification("newReleaseBody", resolvedLocale, { show: showTitle });

    const personalized = await personalizePushContent(
      userId,
      title,
      body,
      { type: "new_release", showTitle },
      resolvedLocale,
    );

    const data = { screen: "show", tmdbId, showId };
    const richContent = posterUrl ? { image: posterUrl } : undefined;

    wsEvents.emit("notification:new", {
      userId,
      notification: { type: "newRelease", title: personalized.title, body: personalized.body, data, imageUrl: posterUrl, createdAt: new Date().toISOString() },
    });

    await createAutomatedInAppNotification({ type: "new_release", userId, title: personalized.title, body: personalized.body, imageUrl: posterUrl, data });
    await logAutomatedNotification(userId, pushToken, personalized.title, personalized.body, data, "new_release", resolvedLocale, richContent);
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

    await createAutomatedInAppNotification({ type: "comment_deleted", userId, title, body, data });
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

    await createAutomatedInAppNotification({ type: "comment_hidden", userId, title, body, data });
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

    await createAutomatedInAppNotification({ type: "comment_auto_spoiler", userId, title, body, data });
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

    await createAutomatedInAppNotification({ type: "comment_admin_spoiler", userId, title, body, data });
    await logAutomatedNotification(userId, pushToken, title, body, data, "comment_admin_spoiler", resolvedLocale);
  },

  async notifyNewMessage(
    recipientId: string,
    senderUsername: string,
    senderAvatarUrl: string | undefined,
    messagePreview: string,
    conversationId: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<void> {
    const { allowed, locale: userLocale, pushToken } = await checkPreference(recipientId, "directMessages");
    if (!allowed || !pushToken) return;

    const resolvedLocale = locale ? (locale as SupportedLocale) : userLocale;
    const title = translateNotification("directMessageTitle", resolvedLocale);
    const preview = messagePreview.length > 100 ? messagePreview.slice(0, 100) + "..." : messagePreview;
    const body = translateNotification("directMessageBody", resolvedLocale, { sender: senderUsername, preview });

    const data: Record<string, unknown> = { screen: "chat", conversationId, otherUsername: senderUsername };
    if (senderAvatarUrl) {
      data.otherUserAvatarUrl = senderAvatarUrl;
    }

    wsEvents.emit("notification:new", {
      userId: recipientId,
      notification: { type: "directMessage", title, body, data, createdAt: new Date().toISOString() },
    });

    await createAutomatedInAppNotification({ type: "direct_message", userId: recipientId, title, body, data });
    await logAutomatedNotification(recipientId, pushToken, title, body, data, "direct_message", resolvedLocale);
  },
};
