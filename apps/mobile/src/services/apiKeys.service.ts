import { api } from "./api";

export type ApiKeyScope = "read" | "write";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface ApiKeyCreateInput {
  name: string;
  scopes: ApiKeyScope[];
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  token: string;
  createdAt: string;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await api.get<{ data: ApiKey[] }>("/account/api-keys");
  return response.data.data;
}

export async function createApiKey(input: ApiKeyCreateInput): Promise<ApiKeyCreateResponse> {
  const response = await api.post<ApiKeyCreateResponse>("/account/api-keys", input);
  return response.data;
}

export async function renameApiKey(id: string, name: string): Promise<ApiKey> {
  const response = await api.patch<ApiKey>(`/account/api-keys/${id}`, { name });
  return response.data;
}

export async function revokeApiKey(id: string): Promise<{ id: string; revokedAt: string }> {
  const response = await api.post<{ id: string; revokedAt: string }>(`/account/api-keys/${id}/revoke`);
  return response.data;
}

export async function deleteApiKey(id: string): Promise<void> {
  await api.delete(`/account/api-keys/${id}`);
}
