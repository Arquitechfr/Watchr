/* eslint-disable no-console */
import { env } from "../config/env.js";
import { SupportedLocale } from "../i18n/translations.js";
import { welcomeTemplate, resetPasswordTemplate } from "./emailTemplates.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

let brevoClient: any = null;

async function getBrevoClient(): Promise<any> {
  if (!env.BREVO_API_KEY) {
    return null;
  }

  if (!brevoClient) {
    const Brevo = await import("@getbrevo/brevo");
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, env.BREVO_API_KEY);
    brevoClient = apiInstance;
  }

  return brevoClient;
}

async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = await getBrevoClient();

  if (!client) {
    console.warn("[EmailService] BREVO_API_KEY not configured — skipping email send");
    return false;
  }

  try {
    const Brevo = await import("@getbrevo/brevo");
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      email: env.BREVO_SENDER_EMAIL ?? "noreply@watchr.app",
      name: env.BREVO_SENDER_NAME,
    };
    sendSmtpEmail.to = [{ email: params.to }];
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.htmlContent = params.html;

    await client.sendTransacEmail(sendSmtpEmail);
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
