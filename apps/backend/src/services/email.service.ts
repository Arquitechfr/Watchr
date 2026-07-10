import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { SupportedLocale } from "../i18n/translations.js";
import { welcomeTemplate, resetPasswordTemplate, banNotificationTemplate, commentDeletedTemplate, commentHiddenTemplate, commentSpoilerTemplate, baseHtml } from "./emailTemplates.js";
import { log, logError } from "../lib/logger.js";
import { EmailLog, EmailTemplate, EmailStatus } from "../models/emailLog.model.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  template: EmailTemplate;
  locale?: string;
  triggeredBy?: string;
}

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
      pool: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

const emailMetrics = {
  sent: 0,
  failed: 0,
  skipped: 0,
};

export function getEmailMetrics() {
  return { ...emailMetrics };
}

async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getTransporter();

  if (!client) {
    emailMetrics.skipped++;
    log("EmailService", "SMTP not configured, skipping send", { to: params.to });
    await EmailLog.create({
      to: params.to,
      subject: params.subject,
      template: params.template,
      status: "skipped" as EmailStatus,
      errorMessage: "SMTP not configured",
      htmlContent: params.html,
      locale: params.locale,
      triggeredBy: params.triggeredBy,
    }).catch((err) => logError("EmailService", "failed to log email", err));
    return false;
  }

  try {
    await client.sendMail({
      from: `${env.SMTP_SENDER_NAME} <${env.SMTP_SENDER_EMAIL ?? "noreply@watchr.app"}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    emailMetrics.sent++;
    log("EmailService", "email sent", { to: params.to, subject: params.subject });
    await EmailLog.create({
      to: params.to,
      subject: params.subject,
      template: params.template,
      status: "sent" as EmailStatus,
      htmlContent: params.html,
      locale: params.locale,
      triggeredBy: params.triggeredBy,
    }).catch((err) => logError("EmailService", "failed to log email", err));
    return true;
  } catch (err) {
    emailMetrics.failed++;
    logError("EmailService", "failed to send email", err, { to: params.to, subject: params.subject });
    await EmailLog.create({
      to: params.to,
      subject: params.subject,
      template: params.template,
      status: "failed" as EmailStatus,
      errorMessage: err instanceof Error ? err.message : String(err),
      htmlContent: params.html,
      locale: params.locale,
      triggeredBy: params.triggeredBy,
    }).catch((logErr) => logError("EmailService", "failed to log email", logErr));
    return false;
  }
}

function sanitizeHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<iframe[\s\S]*?<\/iframe>/gi, "").replace(/on\w+\s*=\s*"[^"]*"/gi, "").replace(/on\w+\s*=\s*'[^']*'/gi, "").replace(/javascript:/gi, "");
}

export const EmailService = {
  async sendWelcomeEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<boolean> {
    const { subject, html } = welcomeTemplate(locale, { username });
    return sendEmail({ to, subject, html, template: "welcome", locale: locale ?? undefined });
  },

  async sendResetPasswordEmail(
    to: string,
    resetUrl: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<boolean> {
    const { subject, html } = resetPasswordTemplate(locale, { resetUrl });
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
    const { subject, html } = banNotificationTemplate(locale, { username, ...params });
    return sendEmail({ to, subject, html, template: "ban_notification", locale: locale ?? undefined, triggeredBy });
  },

  async sendCommentDeletedEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
    params: { showTitle: string },
  ): Promise<boolean> {
    const { subject, html } = commentDeletedTemplate(locale, { username, showTitle: params.showTitle });
    return sendEmail({ to, subject, html, template: "comment_deleted", locale: locale ?? undefined });
  },

  async sendCommentHiddenEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
    params: { showTitle: string },
  ): Promise<boolean> {
    const { subject, html } = commentHiddenTemplate(locale, { username, showTitle: params.showTitle });
    return sendEmail({ to, subject, html, template: "comment_hidden", locale: locale ?? undefined });
  },

  async sendCommentSpoilerEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
    params: { showTitle: string },
  ): Promise<boolean> {
    const { subject, html } = commentSpoilerTemplate(locale, { username, showTitle: params.showTitle });
    return sendEmail({ to, subject, html, template: "comment_spoiler", locale: locale ?? undefined });
  },

  async sendCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    locale?: string,
    triggeredBy?: string,
  ): Promise<boolean> {
    const sanitized = sanitizeHtml(htmlContent);
    const html = baseHtml(sanitized, locale);
    return sendEmail({ to, subject, html, template: "custom", locale, triggeredBy });
  },
};
