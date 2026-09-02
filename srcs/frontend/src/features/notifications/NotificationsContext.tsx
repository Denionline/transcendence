import { type ReactNode, createContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./api";
import type { NotificationDto } from "./types";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../auth/hooks/useAuth";
import { useToast } from "../toast/hooks/useToast";

// Live pushes worth interrupting the user for. "new_message" is deliberately
// absent — the messages UI has its own unread badge and dropdown for those.
const TOASTABLE_NOTIFICATIONS = new Set([
	"new_match",
	"gig_closed",
	"swipe_liked",
	"new_invite",
	"invite_accepted",
]);

type Status = "loading" | "ready" | "error";

interface NotificationsContextValue {
	notifications: NotificationDto[];
	unreadCount: number;
	status: Status;
	refresh: () => void;
	markRead: (id: string) => Promise<void>;
	markAllRead: () => Promise<void>;
	/** Increments on every live "new_notification" push — a cue for
	 *  NotificationBell to play its bump animation. */
	bumpToken: number;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuth();
	//	The id, not the object: AuthProvider hands back a new `user` identity on
	//	every session refresh, which would re-run the fetch for the same person.
	const userId = user?.id ?? null;
	const [notifications, setNotifications] = useState<NotificationDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [retryToken, setRetryToken] = useState(0);
	const [bumpToken, setBumpToken] = useState(0);

	//	Read through a ref so the socket effect below doesn't take `toast` / `t`
	//	as dependencies — `t`'s identity changes on every language switch, which
	//	would otherwise detach and re-attach the listener each time.
	const toast = useToast();
	const { t } = useTranslation();
	const notifyRef = useRef({ toast, t });
	useEffect(() => {
		notifyRef.current = { toast, t };
	});

	useEffect(() => {
		// AuthProvider's own session check (fetchMe) hasn't set the access
		// token yet while isLoading is true — fetching now would go out
		// without it and come back 401. Wait for that to settle, and skip
		// entirely if it settled on "no session".
		if (isLoading || !userId) return;

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
	}, [retryToken, isLoading, userId]);

	useEffect(() => {
		// Mirrors the gate on the data-loading effect above: this provider
		// mounts before AuthProvider's session check resolves, so on first
		// render connectSocket() hasn't run yet and getSocket() is still null.
		// Re-running once `user` settles picks it up instead of the listener
		// silently never attaching.
		if (isLoading || !user) return;

		const socket = getSocket();
		if (!socket) return;

		function handleNotificationEvent(payload?: { type?: string }) {
			setRetryToken((value) => value + 1);
			setBumpToken((value) => value + 1);

			const type = payload?.type;
			if (type && TOASTABLE_NOTIFICATIONS.has(type)) {
				const { toast: notify, t: translate } = notifyRef.current;
				notify.info(translate(`toast.notification.${type}`));
			}
		}

		socket.on("new_notification", handleNotificationEvent);

		return () => {
			socket.off("new_notification", handleNotificationEvent);
		};
	}, [isLoading, user]);

	function refresh() {
		setRetryToken((value) => value + 1);
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
			value={{ notifications, unreadCount, status, refresh, markRead, markAllRead, bumpToken }}
		>
			{children}
		</NotificationsContext.Provider>
	);
}
