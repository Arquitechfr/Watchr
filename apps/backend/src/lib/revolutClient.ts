import { env } from "../config/env.js";

export class RevolutApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Revolut API error: ${status}`);
  }
}

export async function revolutRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${env.REVOLUT_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.REVOLUT_SECRET_KEY}`,
      "Revolut-Api-Version": env.REVOLUT_API_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new RevolutApiError(res.status, await res.json().catch(() => null));
  }
  return res.json() as Promise<T>;
}

export interface RevolutSubscription {
  id: string;
  external_reference: string | null;
  state: string;
}

export async function getRevolutSubscription(id: string): Promise<RevolutSubscription> {
  return revolutRequest<RevolutSubscription>("GET", `/api/subscriptions/${id}`);
}
