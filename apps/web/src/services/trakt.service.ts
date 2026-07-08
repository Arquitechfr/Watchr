import { api } from "./api";

export interface TraktAuthUrlResponse {
  url: string;
}

export interface TraktStatusResponse {
  connected: boolean;
  username?: string;
  autoSync?: boolean;
}

export async function getTraktAuthUrl(): Promise<TraktAuthUrlResponse> {
  const response = await api.get<TraktAuthUrlResponse>("/trakt/auth-url");
  return response.data;
}

export async function linkTraktAccount(code: string): Promise<TraktStatusResponse> {
  const response = await api.post<TraktStatusResponse>("/trakt/callback", { code });
  return response.data;
}

export async function getTraktStatus(): Promise<TraktStatusResponse> {
  const response = await api.get<TraktStatusResponse>("/trakt/status");
  return response.data;
}

export async function syncFromTrakt(): Promise<{ synced: number }> {
  const response = await api.post<{ synced: number }>("/trakt/sync");
  return response.data;
}

export async function unlinkTrakt(): Promise<void> {
  await api.delete("/trakt/unlink");
}

export async function toggleTraktAutoSync(enabled: boolean): Promise<TraktStatusResponse> {
  const response = await api.put<TraktStatusResponse>("/trakt/auto-sync", { enabled });
  return response.data;
}
