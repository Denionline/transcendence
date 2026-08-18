import { Link } from "react-router-dom";
import Avatar from "../../../components/Avatar";
import { formatRelativeTime } from "../../../lib/format";
import { NOTIFICATION_META } from "../utils";
import type { NotificationDto } from "../types";

interface NotificationListItemProps {
	notification: NotificationDto;
	onMarkRead: (id: string) => void;
}

export default function NotificationListItem({
	notification,
	onMarkRead,
}: NotificationListItemProps) {
	const meta = NOTIFICATION_META[notification.type];
	const Icon = meta.icon;

	return (
		<li
			className={`flex items-center gap-3 rounded-2xl border border-base-content/10 p-3 transition-colors ${
				notification.isRead ? "" : "bg-primary/5"
			}`}
		>
			<Link
				to={meta.href(notification)}
				onClick={() => onMarkRead(notification.id)}
				className="flex min-w-0 flex-1 items-center gap-3"
			>
				{notification.actor ? (
					<Avatar
						username={notification.actor.displayName}
						avatarUrl={notification.actor.avatarUrl}
						size="sm"
					/>
				) : (
					<div className="avatar-placeholder avatar shrink-0">
						<div className="w-9 rounded-full bg-neutral text-neutral-content">
							<Icon className="size-4" aria-hidden="true" />
						</div>
					</div>
				)}

				<div className="min-w-0 flex-1">
					<p className="flex items-center gap-1.5 truncate text-sm">
						<Icon className={`size-3.5 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
						<span className="truncate">{meta.message(notification)}</span>
					</p>
					<p className="text-xs text-base-content/50">
						{formatRelativeTime(notification.createdAt)}
					</p>
				</div>
			</Link>

			{!notification.isRead && (
				<button
					type="button"
					aria-label="Mark as read"
					onClick={() => onMarkRead(notification.id)}
					className="btn btn-circle btn-ghost btn-xs shrink-0"
				>
					<span className="size-2 rounded-full bg-primary" aria-hidden="true" />
				</button>
			)}
		</li>
	);
}
