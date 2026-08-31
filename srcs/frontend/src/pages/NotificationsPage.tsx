import { BellIcon } from "lucide-react";
import NotificationListItem from "../features/notifications/components/NotificationListItem";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import { useTranslation } from "react-i18next";

export default function NotificationsPage() {
	const { t } = useTranslation();
	const { notifications, unreadCount, status, refresh, markRead, markAllRead } = useNotifications();

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">{t("notifications.title")}</h1>
					<p className="text-sm text-base-content/50">
						{status === "ready"
							? t("notifications.unread", { count: unreadCount })
							: t("notifications.loading")}
					</p>
				</div>
				{unreadCount > 0 && (
					<button type="button" onClick={markAllRead} className="btn btn-sm rounded-full">
						{t("notifications.markAllRead")}
					</button>
				)}
			</div>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">{t("notifications.couldntLoad")}</p>
					<button type="button" onClick={refresh} className="btn btn-sm mt-2 rounded-full">
						{t("notifications.tryAgain")}
					</button>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					{t("notifications.loadingNotifications")}
				</div>
			)}

			{status === "ready" && notifications.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<BellIcon className="size-6" aria-hidden="true" />
					<p className="font-medium">{t("notifications.noneYet")}</p>
					<p className="text-sm">{t("notifications.willShowHere")}</p>
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
