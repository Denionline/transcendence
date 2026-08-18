import { type ReactNode, createContext, useEffect, useState } from "react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./api";
import type { NotificationDto } from "./types";

const POLL_INTERVAL_MS = 45_000;

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
		const interval = setInterval(load, POLL_INTERVAL_MS);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [retryToken]);

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
