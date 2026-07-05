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
  createdAt: string;
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
