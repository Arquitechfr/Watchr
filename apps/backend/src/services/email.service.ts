/* eslint-disable no-console */
import { BrevoClient } from "@getbrevo/brevo";
import { env } from "../config/env.js";
import { SupportedLocale } from "../i18n/translations.js";
import { welcomeTemplate, resetPasswordTemplate } from "./emailTemplates.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

let brevoClient: BrevoClient | null = null;

function getBrevoClient(): BrevoClient | null {
  if (!env.BREVO_API_KEY) {
    return null;
  }

  if (!brevoClient) {
    brevoClient = new BrevoClient({ apiKey: env.BREVO_API_KEY });
  }

  return brevoClient;
}

async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getBrevoClient();

  if (!client) {
    console.warn("[EmailService] BREVO_API_KEY not configured — skipping email send");
    return false;
  }

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: {
        email: env.BREVO_SENDER_EMAIL ?? "noreply@watchr.app",
        name: env.BREVO_SENDER_NAME,
      },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
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
