import { log } from "../utils/logger";
import { api } from "./api";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  log("AuthService", "login request", { email: input.email });
  const response = await api.post<AuthTokens>("/auth/login", input);
  log("AuthService", "login response", { status: response.status });
  return response.data;
}

export async function loginWithGoogle(idToken: string): Promise<AuthTokens> {
  log("AuthService", "google login request");
  const response = await api.post<AuthTokens>("/auth/firebase", { idToken });
  log("AuthService", "google login response", { status: response.status });
  return response.data;
}

export async function register(input: RegisterInput): Promise<AuthTokens> {
  log("AuthService", "register request", { email: input.email });
  const response = await api.post<AuthTokens>("/auth/register", input);
  log("AuthService", "register response", { status: response.status });
  return response.data;
}

export async function logout(refreshToken: string): Promise<void> {
  log("AuthService", "logout request");
  await api.post("/auth/logout", { refreshToken });
  log("AuthService", "logout success");
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  log("AuthService", "refresh token request");
  const response = await api.post<AuthTokens>("/auth/refresh", { refreshToken });
  log("AuthService", "refresh token response", { status: response.status });
  return response.data;
}

export interface Me {
  id: string;
  email: string;
  username: string;
  usernameChanged: boolean;
  avatarUrl?: string;
  preferredLanguage?: string;
  themePreference: "system" | "light" | "dark";
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

export async function getMe(): Promise<Me> {
  const response = await api.get<Me>("/auth/me");
  return response.data;
}

export async function updateLanguage(language: string): Promise<{ preferredLanguage: string }> {
  const response = await api.patch<{ preferredLanguage: string }>("/auth/me/language", { language });
  return response.data;
}

export async function uploadAvatar(file: { uri: string; type: string; name: string }): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append("avatar", file as unknown as Blob);
  const response = await api.post<{ avatarUrl: string }>("/auth/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateUsername(username: string): Promise<{ username: string; usernameChanged: boolean }> {
  const response = await api.patch<{ username: string; usernameChanged: boolean }>("/auth/me/username", { username });
  return response.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword });
}

export async function registerPushToken(token: string): Promise<void> {
  await api.post("/auth/me/push-token", { token });
}

export async function unregisterPushToken(): Promise<void> {
  await api.delete("/auth/me/push-token");
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  newReleases: boolean;
  commentReplies: boolean;
  commentReactions: boolean;
  commentLikes: boolean;
}

export async function getNotificationPreferences(): Promise<{ notificationPreferences: NotificationPreferences }> {
  const response = await api.get<{ notificationPreferences: NotificationPreferences }>("/auth/me/notification-preferences");
  return response.data;
}

export async function updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<{ notificationPreferences: NotificationPreferences }> {
  const response = await api.patch<{ notificationPreferences: NotificationPreferences }>("/auth/me/notification-preferences", prefs);
  return response.data;
}

export async function updateThemePreference(pref: "system" | "light" | "dark"): Promise<{ themePreference: string }> {
  const response = await api.patch<{ themePreference: string }>("/auth/me/theme-preference", { themePreference: pref });
  return response.data;
}

export async function completeOnboarding(): Promise<{ hasCompletedOnboarding: boolean }> {
  log("AuthService", "completeOnboarding request");
  const response = await api.patch<{ hasCompletedOnboarding: boolean }>("/auth/me/onboarding", {});
  log("AuthService", "completeOnboarding response", { status: response.status });
  return response.data;
}
