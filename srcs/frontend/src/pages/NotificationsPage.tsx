import { BellIcon } from "lucide-react";
import NotificationListItem from "../features/notifications/components/NotificationListItem";
import { useNotifications } from "../features/notifications/hooks/useNotifications";

export default function NotificationsPage() {
	const { notifications, unreadCount, status, refresh, markRead, markAllRead } = useNotifications();

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Notifications</h1>
					<p className="text-sm text-base-content/50">
						{status === "ready" ? `${unreadCount} unread` : "Loading…"}
					</p>
				</div>
				{unreadCount > 0 && (
					<button type="button" onClick={markAllRead} className="btn btn-sm rounded-full">
						Mark all as read
					</button>
				)}
			</div>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">Couldn&rsquo;t load notifications</p>
					<button type="button" onClick={refresh} className="btn btn-sm mt-2 rounded-full">
						Try again
					</button>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					Loading notifications…
				</div>
			)}

			{status === "ready" && notifications.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<BellIcon className="size-6" aria-hidden="true" />
					<p className="font-medium">No notifications yet</p>
					<p className="text-sm">Matches, messages, and updates will show up here.</p>
				</div>
			)}

			{status === "ready" && notifications.length > 0 && (
				<ul className="flex flex-col gap-3">
					{notifications.map((notification) => (
						<NotificationListItem
							key={notification.id}
							notification={notification}
							onMarkRead={markRead}
						/>
					))}
				</ul>
			)}
		</div>
	);
}
