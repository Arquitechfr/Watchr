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
