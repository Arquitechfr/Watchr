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

export interface Me {
  id: string;
  email: string;
  username: string;
  usernameChanged: boolean;
  avatarUrl?: string;
  preferredLanguage?: string;
  themePreference: "system" | "light" | "dark";
  hasCompletedOnboarding: boolean;
  googleLinked: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  newReleases: boolean;
  commentReplies: boolean;
  commentReactions: boolean;
  commentLikes: boolean;
  notificationOffsetMinutes: number;
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/auth/login", input);
  return response.data;
}

export async function register(input: RegisterInput): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/auth/register", input);
  return response.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refreshToken });
}

export async function getMe(): Promise<Me> {
  const response = await api.get<Me>("/auth/me");
  return response.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword });
}

export async function loginWithGoogle(idToken: string): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/auth/firebase", { idToken });
  return response.data;
}

export async function updateLanguage(language: string): Promise<{ preferredLanguage: string }> {
  const response = await api.patch<{ preferredLanguage: string }>("/auth/me/language", { language });
  return response.data;
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await api.post<{ avatarUrl: string }>("/auth/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateUsername(username: string): Promise<{ username: string; usernameChanged: boolean }> {
  const response = await api.patch<{ username: string; usernameChanged: boolean }>("/auth/me/username", { username });
  return response.data;
}

export async function updateThemePreference(pref: "system" | "light" | "dark"): Promise<{ themePreference: string }> {
  const response = await api.patch<{ themePreference: string }>("/auth/me/theme-preference", { themePreference: pref });
  return response.data;
}

export async function completeOnboarding(): Promise<{ hasCompletedOnboarding: boolean }> {
  const response = await api.patch<{ hasCompletedOnboarding: boolean }>("/auth/me/onboarding", {});
  return response.data;
}

export async function getNotificationPreferences(): Promise<{ notificationPreferences: NotificationPreferences }> {
  const response = await api.get<{ notificationPreferences: NotificationPreferences }>("/auth/me/notification-preferences");
  return response.data;
}

export async function updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<{ notificationPreferences: NotificationPreferences }> {
  const response = await api.patch<{ notificationPreferences: NotificationPreferences }>("/auth/me/notification-preferences", prefs);
  return response.data;
}

export async function linkGoogleAccount(idToken: string): Promise<{ googleLinked: boolean }> {
  const response = await api.post<{ googleLinked: boolean }>("/auth/me/link-google", { idToken });
  return response.data;
}

export async function unlinkGoogleAccount(): Promise<{ googleLinked: boolean }> {
  const response = await api.delete<{ googleLinked: boolean }>("/auth/me/link-google");
  return response.data;
}
