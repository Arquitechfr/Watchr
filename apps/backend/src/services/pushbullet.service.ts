import { env } from "../config/env.js";
import { log, logError } from "../lib/logger.js";

const PUSHBULLET_API_URL = "https://api.pushbullet.com/v2/pushes";
const REQUEST_TIMEOUT_MS = 5000;

class PushbulletService {
  private token: string | undefined;

  constructor() {
    this.token = env.PUSHBULLET_ACCESS_TOKEN;
    if (this.token) {
      log("PushbulletService", "initialized", { hasToken: true });
    } else {
      log("PushbulletService", "not configured — PUSHBULLET_ACCESS_TOKEN missing");
    }
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  async push(title: string, body: string): Promise<boolean> {
    if (!this.token) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(PUSHBULLET_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": this.token,
        },
        body: JSON.stringify({ type: "note", title, body }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logError("PushbulletService", "push failed", null, {
          status: response.status,
          statusText: response.statusText,
        });
        return false;
      }

      log("PushbulletService", "push sent", { title });
      return true;
    } catch (err) {
      logError("PushbulletService", "push error", err, { title });
      return false;
    }
  }

  async pushLink(title: string, url: string, body?: string): Promise<boolean> {
    if (!this.token) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const payload: Record<string, string> = { type: "link", title, url };
      if (body) payload.body = body;

      const response = await fetch(PUSHBULLET_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": this.token,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logError("PushbulletService", "pushLink failed", null, {
          status: response.status,
          statusText: response.statusText,
        });
        return false;
      }

      log("PushbulletService", "pushLink sent", { title, url });
      return true;
    } catch (err) {
      logError("PushbulletService", "pushLink error", err, { title, url });
      return false;
    }
  }

  async notifySignup(email: string, username: string, provider: string = "email"): Promise<boolean> {
    return this.push("New user registered", `${username} (${email}) just signed up via ${provider}.`);
  }

  async notifyReport(
    reason: string,
    reporterId: string,
    showTitle?: string,
    commentPreview?: string,
    authorUsername?: string,
  ): Promise<boolean> {
    const parts = [`Report (${reason})`];
    if (showTitle) parts.push(`on "${showTitle}"`);
    if (authorUsername) parts.push(`by ${authorUsername}`);
    if (commentPreview) parts.push(`: "${commentPreview}"`);
    parts.push(`Reporter: ${reporterId}`);
    return this.push("New comment report", parts.join(" "));
  }

  async notifyContact(
    subject: string,
    category: string,
    username: string,
    messagePreview?: string,
  ): Promise<boolean> {
    const body = messagePreview
      ? `${username} — ${subject}: ${messagePreview}`
      : `${username}: ${subject}`;
    return this.push(`New contact message: ${category}`, body);
  }

  async notifyError(service: string, message: string): Promise<boolean> {
    return this.push("Critical error", `[${service}] ${message}`);
  }

  async notifyModeration(action: string, targetUser: string, moderator: string): Promise<boolean> {
    return this.push("Moderation action", `${moderator} performed ${action} on ${targetUser}.`);
  }
}

export const pushbulletService = new PushbulletService();
