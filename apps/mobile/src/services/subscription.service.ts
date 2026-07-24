import { api } from "./api";

export interface SubscriptionStatus {
  plan: "free" | "vip";
  state?: string;
  startDate?: string | null;
  mcpQuota?: { remaining: number; limit: number };
}

export interface StartSubscriptionResponse {
  checkoutUrl: string;
  subscriptionId: string;
}

export async function startSubscription(): Promise<StartSubscriptionResponse> {
  const response = await api.post<StartSubscriptionResponse>("/subscriptions/start");
  return response.data;
}

export async function cancelSubscription(): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>("/subscriptions/cancel");
  return response.data;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await api.get<SubscriptionStatus>("/subscriptions/status");
  return response.data;
}
