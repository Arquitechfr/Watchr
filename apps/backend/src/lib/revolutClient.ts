import { env } from "../config/env.js";

export class RevolutApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Revolut API error: ${status}`);
  }
}

export async function revolutRequest<T>(
  method: "GET" | "POST" | "PATCH",
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
  if (res.status === 204) {
    return undefined as T;
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

export interface RevolutCustomer {
  id: string;
  email: string;
}

export async function createRevolutCustomer(email: string, fullName?: string): Promise<RevolutCustomer> {
  return revolutRequest<RevolutCustomer>("POST", "/api/customers", {
    email,
    ...(fullName ? { full_name: fullName } : {}),
  });
}

export interface RevolutSubscriptionCreated {
  id: string;
  setup_order_id: string;
  state: string;
}

export async function createRevolutSubscription(params: {
  plan_variation_id: string;
  customer_id: string;
  external_reference: string;
  setup_order_redirect_url: string;
}): Promise<RevolutSubscriptionCreated> {
  return revolutRequest<RevolutSubscriptionCreated>("POST", "/api/subscriptions", params);
}

export interface RevolutOrder {
  id: string;
  checkout_url: string;
  state: string;
}

export async function getRevolutOrder(orderId: string): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>("GET", `/api/orders/${orderId}`);
}

export async function cancelRevolutSubscription(subscriptionId: string): Promise<void> {
  await revolutRequest<void>("PATCH", `/api/subscriptions/${subscriptionId}`, {
    state: "cancelled",
  });
}
