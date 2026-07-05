import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const firebaseLoginSchema = z.object({
  idToken: z.string().min(1, "Firebase ID token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const pushTokenSchema = z.object({
  token: z.string().min(1, "Push token is required"),
});

export const themePreferenceSchema = z.object({
  themePreference: z.enum(["system", "light", "dark"]),
});

export const notificationPreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  newReleases: z.boolean().optional(),
  commentReplies: z.boolean().optional(),
  commentReactions: z.boolean().optional(),
  commentLikes: z.boolean().optional(),
});

export const onboardingCompleteSchema = z.object({}).strict();
