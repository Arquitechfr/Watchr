/* eslint-disable no-console */
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { SupportedLocale } from "../i18n/translations.js";
import { welcomeTemplate, resetPasswordTemplate } from "./emailTemplates.js";

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
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getTransporter();

  if (!client) {
    console.warn("[EmailService] SMTP credentials not configured — skipping email send");
    return false;
  }

  try {
    await client.sendMail({
      from: `${env.SMTP_SENDER_NAME} <${env.SMTP_SENDER_EMAIL ?? "noreply@watchr.app"}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    console.log(`[EmailService] Email sent to ${params.to}: ${params.subject}`);
    return true;
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${params.to}:`, err);
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
