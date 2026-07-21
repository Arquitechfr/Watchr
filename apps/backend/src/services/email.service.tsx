import nodemailer from "nodemailer";
import axios from "axios";
import { env } from "../config/env.js";
import { SupportedLocale } from "../i18n/translations.js";
import { translateEmail } from "../i18n/index.js";
import {
  renderEmail,
  WelcomeEmail,
  ResetPasswordEmail,
  BanNotificationEmail,
  EmailCodeEmail,
  CommentDeletedEmail,
  CommentHiddenEmail,
  CommentSpoilerEmail,
  CustomEmail,
} from "../emails/index.js";
import { log, logError } from "../lib/logger.js";
import { EmailLog, EmailTemplate, EmailStatus } from "../models/emailLog.model.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { getEmailQueue, type EmailJobData } from "../workers/email.worker.js";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  template: EmailTemplate;
  locale?: string;
  triggeredBy?: string;
}

type EmailErrorType = "brevo_api_error" | "connection_timeout" | "auth_failed" | "smtp_error" | "unknown";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      requireTLS: env.SMTP_PORT === 587,
      pool: true,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
      maxConnections: 5,
      maxMessages: 100,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

function classifyError(err: unknown): EmailErrorType {
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") return "connection_timeout";
    if (err.response?.status === 401 || err.response?.status === 403) return "auth_failed";
    if (err.code === "ECONNRESET" || err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") return "connection_timeout";
    return "brevo_api_error";
  }
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ECONNABORTED" || code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ENOTFOUND") return "connection_timeout";
    if (err.message.includes("EAUTH") || err.message.includes("Invalid login")) return "auth_failed";
    if (err.message.includes("timeout") || err.message.includes("Connection timeout")) return "connection_timeout";
    return "smtp_error";
  }
  return "unknown";
}

function isRetryableError(err: unknown): boolean {
  const type = classifyError(err);
  if (type === "connection_timeout") return true;
  if (type === "brevo_api_error" && axios.isAxiosError(err)) {
    const status = err.response?.status;
    return status !== undefined && status >= 500;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendViaBrevoApi(params: SendEmailParams): Promise<void> {
  const senderEmail = env.SMTP_SENDER_EMAIL ?? "noreply@watchr.app";
  const response = await axios.post(
    BREVO_API_URL,
    {
      sender: { name: env.SMTP_SENDER_NAME, email: senderEmail },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
    },
    {
      headers: {
        "api-key": env.BREVO_API_KEY!,
        "content-type": "application/json",
        accept: "application/json",
      },
      timeout: 15_000,
    },
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Brevo API returned status ${response.status}: ${JSON.stringify(response.data)}`);
  }
}

async function sendViaSmtp(params: SendEmailParams): Promise<void> {
  const client = getTransporter();
  if (!client) {
    throw new Error("SMTP not configured");
  }
  await client.sendMail({
    from: `${env.SMTP_SENDER_NAME} <${env.SMTP_SENDER_EMAIL ?? "noreply@watchr.app"}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

async function sendWithRetry(params: SendEmailParams): Promise<void> {
  const useBrevoApi = !!env.BREVO_API_KEY;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (useBrevoApi) {
        await sendViaBrevoApi(params);
      } else {
        await sendViaSmtp(params);
      }
      return;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1 && isRetryableError(err)) {
        log("EmailService", "retrying send", {
          to: params.to,
          subject: params.subject,
          attempt: attempt + 1,
          errorType: classifyError(err),
          nextDelayMs: RETRY_DELAYS_MS[attempt],
        });
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      break;
    }
  }

  throw lastError;
}

const emailMetrics = {
  sent: 0,
  failed: 0,
  skipped: 0,
};

export function getEmailMetrics() {
  return { ...emailMetrics };
}

function isEmailConfigured(): boolean {
  return !!env.BREVO_API_KEY || (!!env.SMTP_USER && !!env.SMTP_PASS);
}

async function isEmailQueueEnabled(): Promise<boolean> {
  try {
    const entry = await MobileConfig.findOne({ key: "email_queue_enabled" }).lean();
    return entry?.value !== "false";
  } catch {
    return true;
  }
}

async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const queueEnabled = await isEmailQueueEnabled();
    if (queueEnabled) {
      const queue = getEmailQueue();
      await queue.add("send", params as unknown as EmailJobData);
      log("EmailService", "email queued", { to: params.to, subject: params.subject, template: params.template });
      return true;
    }
  } catch (err) {
    logError("EmailService", "queue failed, falling back to sync", err, { to: params.to });
  }

  return sendEmailDirect(params);
}

function injectTrackingPixel(html: string, emailLogId: string): string {
  const pixelUrl = `${env.PUBLIC_URL}/api/track/email-open?eid=${emailLogId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;outline:none;" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

function wrapCtaUrl(url: string, emailLogId: string): string {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  if (url.includes("/api/track/")) return url;
  return `${env.PUBLIC_URL}/api/track/email-click?eid=${emailLogId}&url=${encodeURIComponent(url)}`;
}

function wrapCtaLinks(html: string, emailLogId: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/gi, (_match, url: string) => {
    if (url.includes("/api/track/")) return `href="${url}"`;
    return `href="${wrapCtaUrl(url, emailLogId)}"`;
  });
}

export async function sendEmailDirect(params: SendEmailParams): Promise<boolean> {
  if (!isEmailConfigured()) {
    emailMetrics.skipped++;
    log("EmailService", "email not configured, skipping send", { to: params.to });
    await EmailLog.create({
      to: params.to,
      subject: params.subject,
      template: params.template,
      status: "skipped" as EmailStatus,
      errorMessage: "Email not configured (no BREVO_API_KEY or SMTP credentials)",
      htmlContent: params.html,
      locale: params.locale,
      triggeredBy: params.triggeredBy,
    }).catch((err) => logError("EmailService", "failed to log email", err));
    return false;
  }

  let emailLogId: string | undefined;
  try {
    const emailLog = await EmailLog.create({
      to: params.to,
      subject: params.subject,
      template: params.template,
      status: "sent" as EmailStatus,
      htmlContent: params.html,
      locale: params.locale,
      triggeredBy: params.triggeredBy,
    });
    emailLogId = emailLog._id.toString();
  } catch (err) {
    logError("EmailService", "failed to create email log", err);
  }

  const trackedHtml = emailLogId
    ? wrapCtaLinks(injectTrackingPixel(params.html, emailLogId), emailLogId)
    : params.html;

  try {
    await sendWithRetry({ ...params, html: trackedHtml });
    emailMetrics.sent++;
    log("EmailService", "email sent", { to: params.to, subject: params.subject, provider: env.BREVO_API_KEY ? "brevo_api" : "smtp" });
    return true;
  } catch (err) {
    const errorType = classifyError(err);
    emailMetrics.failed++;
    logError("EmailService", "failed to send email", err, { to: params.to, subject: params.subject, errorType, provider: env.BREVO_API_KEY ? "brevo_api" : "smtp" });
    if (emailLogId) {
      await EmailLog.findByIdAndUpdate(emailLogId, {
        status: "failed" as EmailStatus,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorType,
      }).catch((logErr) => logError("EmailService", "failed to update email log", logErr));
    } else {
      await EmailLog.create({
        to: params.to,
        subject: params.subject,
        template: params.template,
        status: "failed" as EmailStatus,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorType,
        htmlContent: params.html,
        locale: params.locale,
        triggeredBy: params.triggeredBy,
      }).catch((logErr) => logError("EmailService", "failed to log email", logErr));
    }
    return false;
  }
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<img([^>]*?)src\s*=\s*"(.*?)"/gi, (_match, attrs: string, src: string) => {
      if (/^https?:\/\//i.test(src)) {
        return `<img${attrs}src="${src}"`;
      }
      return "";
    })
    .replace(/<img([^>]*?)src\s*=\s*'([^']*)'/gi, (_match, attrs: string, src: string) => {
      if (/^https?:\/\//i.test(src)) {
        return `<img${attrs}src="${src}"`;
      }
      return "";
    });
}

export const EmailService = {
  async sendWelcomeEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<boolean> {
    const subject = translateEmail("welcomeSubject", locale);
    const html = await renderEmail(<WelcomeEmail locale={locale} username={username} />);
    return sendEmail({ to, subject, html, template: "welcome", locale: locale ?? undefined });
  },

  async sendResetPasswordEmail(
    to: string,
    resetUrl: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<boolean> {
    const subject = translateEmail("resetPasswordSubject", locale);
    const html = await renderEmail(<ResetPasswordEmail locale={locale} resetUrl={resetUrl} />);
    return sendEmail({ to, subject, html, template: "reset_password", locale: locale ?? undefined });
  },

  async sendBanNotificationEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
    params: {
      action: string;
      reason: string;
      effectiveDate: string;
      suspendedUntil?: string;
    },
    triggeredBy?: string,
  ): Promise<boolean> {
    const subject = translateEmail("banSubject", locale, { username });
    const html = await renderEmail(
      <BanNotificationEmail
        locale={locale}
        username={username}
        action={params.action}
        reason={params.reason}
        effectiveDate={params.effectiveDate}
        suspendedUntil={params.suspendedUntil}
      />,
    );
    return sendEmail({ to, subject, html, template: "ban_notification", locale: locale ?? undefined, triggeredBy });
  },

  async sendCommentDeletedEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
    params: { showTitle: string },
  ): Promise<boolean> {
    const subject = translateEmail("commentDeletedSubject", locale);
    const html = await renderEmail(<CommentDeletedEmail locale={locale} username={username} showTitle={params.showTitle} />);
    return sendEmail({ to, subject, html, template: "comment_deleted", locale: locale ?? undefined });
  },

  async sendCommentHiddenEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
    params: { showTitle: string },
  ): Promise<boolean> {
    const subject = translateEmail("commentHiddenSubject", locale);
    const html = await renderEmail(<CommentHiddenEmail locale={locale} username={username} showTitle={params.showTitle} />);
    return sendEmail({ to, subject, html, template: "comment_hidden", locale: locale ?? undefined });
  },

  async sendCommentSpoilerEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
    params: { showTitle: string },
  ): Promise<boolean> {
    const subject = translateEmail("commentSpoilerSubject", locale);
    const html = await renderEmail(<CommentSpoilerEmail locale={locale} username={username} showTitle={params.showTitle} />);
    return sendEmail({ to, subject, html, template: "comment_spoiler", locale: locale ?? undefined });
  },

  async sendEmailCodeEmail(
    to: string,
    code: string,
    url: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<boolean> {
    const subject = translateEmail("emailCodeSubject", locale);
    const html = await renderEmail(<EmailCodeEmail locale={locale} code={code} url={url} />);
    return sendEmail({ to, subject, html, template: "email_code", locale: locale ?? undefined });
  },

  async sendCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    locale?: string,
    triggeredBy?: string,
    ctaUrl?: string,
  ): Promise<boolean> {
    const sanitized = sanitizeHtml(htmlContent);
    const html = await renderEmail(<CustomEmail innerHtml={sanitized} locale={locale} previewText={subject} ctaUrl={ctaUrl} />);
    return sendEmail({ to, subject, html, template: "custom", locale, triggeredBy });
  },

  async sendContactReplyEmail(
    to: string,
    originalSubject: string,
    replyMessage: string,
    locale: string | undefined,
    triggeredBy?: string,
  ): Promise<boolean> {
    const subject = `Re: ${originalSubject}`;
    const sanitized = sanitizeHtml(replyMessage);
    const html = await renderEmail(<CustomEmail innerHtml={sanitized} locale={locale} previewText={subject} />);
    return sendEmail({ to, subject, html, template: "contact_reply", locale, triggeredBy });
  },
};
