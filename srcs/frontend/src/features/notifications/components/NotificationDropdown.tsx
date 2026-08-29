import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import NotificationListItem from "./NotificationListItem";
import { useTranslation } from "react-i18next";

const RECENT_LIMIT = 6;

export default function NotificationDropdown() {
	const { t } = useTranslation();
	const { notifications, unreadCount, status, markRead, markAllRead } = useNotifications();
	const recent = notifications.slice(0, RECENT_LIMIT);

	return (
		<div className="flex max-h-[70vh] flex-col">
			<div className="flex items-center justify-between px-2 pb-2">
				<span className="menu-title px-0">{t("notifications.title")}</span>
				{unreadCount > 0 && (
					<button
						type="button"
						onClick={markAllRead}
						className="link text-xs font-medium link-primary"
					>
						{t("notifications.markAllRead")}
					</button>
				)}
			</div>

			{status === "loading" && (
				<div className="flex h-24 items-center justify-center text-sm text-base-content/50">
					{t("notifications.loading")}
				</div>
			)}

			{status === "error" && (
				<div className="flex h-24 items-center justify-center px-2 text-center text-sm text-error">
					{t("notifications.couldntLoadShort")}
				</div>
			)}

			{status === "ready" && recent.length === 0 && (
				<div className="flex h-24 items-center justify-center px-2 text-center text-sm text-base-content/50">
					{t("notifications.allCaughtUp")}
				</div>
			)}

			{status === "ready" && recent.length > 0 && (
				<ul className="flex flex-col gap-2 overflow-y-auto px-1">
					{recent.map((notification) => (
						<NotificationListItem
							key={notification.id}
							notification={notification}
							onMarkRead={markRead}
						/>
					))}
				</ul>
			)}

			<div className="mt-2 border-t border-base-content/10 pt-2 text-center">
				<Link to="/notifications" className="link text-sm font-medium link-primary">
					{t("common.viewAll")}
				</Link>
			</div>
		</div>
	);
}
