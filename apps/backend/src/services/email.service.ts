import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { SupportedLocale } from "../i18n/translations.js";
import { welcomeTemplate, resetPasswordTemplate } from "./emailTemplates.js";
import { log, logError } from "../lib/logger.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
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
    return true;
  } catch (err) {
    emailMetrics.failed++;
    logError("EmailService", "failed to send email", err, { to: params.to, subject: params.subject });
    return false;
  }
}

export const EmailService = {
  async sendWelcomeEmail(
    to: string,
    username: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<boolean> {
    const { subject, html } = welcomeTemplate(locale, { username });
    return sendEmail({ to, subject, html });
  },

  async sendResetPasswordEmail(
    to: string,
    resetUrl: string,
    locale: SupportedLocale | string | undefined,
  ): Promise<boolean> {
    const { subject, html } = resetPasswordTemplate(locale, { resetUrl });
    return sendEmail({ to, subject, html });
  },
};
