import { apiRequest } from "../../lib/apiClient";
import type { NotificationDto } from "./types";

function byCreatedAtDesc(a: NotificationDto, b: NotificationDto): number {
	return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export async function listNotifications(): Promise<NotificationDto[]> {
	const { items } = await apiRequest<{ items: NotificationDto[] }>("/notifications");
	return items.sort(byCreatedAtDesc);
}

export async function markNotificationRead(id: string): Promise<void> {
	await apiRequest<void>(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
	await apiRequest<void>("/notifications/read-all", { method: "PATCH" });
}
