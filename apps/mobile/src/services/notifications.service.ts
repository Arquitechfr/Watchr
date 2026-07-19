import { api } from "./api";

export interface ActiveInAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export async function getActiveInAppNotifications(): Promise<ActiveInAppNotification[]> {
  const response = await api.get<{ notifications: ActiveInAppNotification[] }>("/in-app-notifications");
  return response.data.notifications;
}

export async function dismissInAppNotification(id: string): Promise<void> {
  await api.post(`/in-app-notifications/${id}/dismiss`);
}
