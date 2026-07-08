import { env } from "../config/env.js";

interface SignupWebhookPayload {
  email: string;
  username: string;
  userId: string;
  createdAt: string;
  preferredLanguage: string;
  signupMethod: "email" | "firebase";
}

export async function sendSignupToMake(
  user: { email: string; username: string; _id: any; createdAt: Date; preferredLanguage?: string },
  signupMethod: "email" | "firebase",
): Promise<void> {
  const webhookUrl = env.MAKE_WEBHOOK_URL;
  const apiKey = env.MAKE_API_KEY;

  if (!webhookUrl || !apiKey) {
    return;
  }

  const payload: SignupWebhookPayload = {
    email: user.email,
    username: user.username,
    userId: user._id.toString(),
    createdAt: user.createdAt.toISOString(),
    preferredLanguage: user.preferredLanguage ?? "en",
    signupMethod,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-make-apikey": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    console.error("Failed to send signup webhook to Make.com:", error);
  }
}
