import { type ReactNode, createContext, useEffect, useState } from "react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./api";
import type { NotificationDto } from "./types";
import { getSocket } from "../../lib/socket";

type Status = "loading" | "ready" | "error";

interface NotificationsContextValue {
	notifications: NotificationDto[];
	unreadCount: number;
	status: Status;
	refresh: () => void;
	markRead: (id: string) => Promise<void>;
	markAllRead: () => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
	const [notifications, setNotifications] = useState<NotificationDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [retryToken, setRetryToken] = useState(0);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const items = await listNotifications();
				if (cancelled) return;
				setNotifications(items);
				setStatus("ready");
			} catch {
				if (!cancelled) setStatus("error");
			}
		}

		load();

		return () => {
			cancelled = true;
		};
	}, [retryToken]);

	useEffect(() => {
		const socket = getSocket();

		function handleNotificationEvent() {
			setRetryToken((t) => t + 1);
		}

		socket.on("new_notification", handleNotificationEvent);

		return () => {
			socket.off("new_notification", handleNotificationEvent);
		};
	}, []);

	function refresh() {
		setRetryToken((t) => t + 1);
	}

	async function markRead(id: string) {
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
		await markNotificationRead(id);
	}

	async function markAllRead() {
		setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
		await markAllNotificationsRead();
	}

	const unreadCount = notifications.filter((n) => !n.isRead).length;

	return (
		<NotificationsContext.Provider
			value={{ notifications, unreadCount, status, refresh, markRead, markAllRead }}
		>
			{children}
		</NotificationsContext.Provider>
	);
}
