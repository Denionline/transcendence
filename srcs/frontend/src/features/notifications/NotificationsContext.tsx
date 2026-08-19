import { type ReactNode, createContext, useEffect, useState } from "react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./api";
import type { NotificationDto } from "./types";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../auth/hooks/useAuth";

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
	const { user, isLoading } = useAuth();
	const [notifications, setNotifications] = useState<NotificationDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [retryToken, setRetryToken] = useState(0);

	useEffect(() => {
		// AuthProvider's own session check (fetchMe) hasn't set the access
		// token yet while isLoading is true — fetching now would go out
		// without it and come back 401. Wait for that to settle, and skip
		// entirely if it settled on "no session".
		if (isLoading || !user) return;

		let cancelled = false;

		async function load() {
			try {
				const items = await listNotifications();
				if (cancelled) return;
				// New-message activity belongs in the chat/messages UI, not the bell.
				setNotifications(items.filter((n) => n.type !== "new_message"));
				setStatus("ready");
			} catch {
				if (!cancelled) setStatus("error");
			}
		}

		load();

		return () => {
			cancelled = true;
		};
	}, [retryToken, isLoading, user?.id]);

	useEffect(() => {
		// Mirrors the gate on the data-loading effect above: this provider
		// mounts before AuthProvider's session check resolves, so on first
		// render connectSocket() hasn't run yet and getSocket() is still null.
		// Re-running once `user` settles picks it up instead of the listener
		// silently never attaching.
		if (isLoading || !user) return;

		const socket = getSocket();
		if (!socket) return;

		function handleNotificationEvent() {
			setRetryToken((t) => t + 1);
		}

		socket.on("new_notification", handleNotificationEvent);

		return () => {
			socket.off("new_notification", handleNotificationEvent);
		};
	}, [isLoading, user]);

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
