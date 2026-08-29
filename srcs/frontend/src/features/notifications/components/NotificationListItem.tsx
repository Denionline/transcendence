import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../../../components/Avatar";
import { formatRelativeTime } from "../../../lib/format";
import { useAuth } from "../../auth/hooks/useAuth";
import RespondRequestModal from "../../friends/components/RespondRequestModal";
import { NOTIFICATION_META } from "../utils";
import type { NotificationDto } from "../types";
import { useTranslation } from "react-i18next";

interface NotificationListItemProps {
	notification: NotificationDto;
	onMarkRead: (id: string) => void;
}

export default function NotificationListItem({
	notification,
	onMarkRead,
}: NotificationListItemProps) {
	const { t } = useTranslation();
	const { user } = useAuth();
	const isHirer = user?.role === "hirer";
	const meta = NOTIFICATION_META[notification.type];
	const Icon = meta.icon;
	// Only new_invite sets respondsInline, and only once its actor is known —
	// opening the modal is what "responds inline" actually means here.
	const respondsInline = meta.respondsInline && Boolean(notification.actor);
	const [showRespondModal, setShowRespondModal] = useState(false);

	const rowContent = (
		<>
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
					<span className="truncate">{meta.message(notification, isHirer)}</span>
				</p>
				<p className="text-xs text-base-content/50">{formatRelativeTime(notification.createdAt)}</p>
			</div>
		</>
	);

	return (
		<li
			className={`flex items-center gap-3 rounded-2xl border border-base-content/10 p-3 transition-colors ${
				notification.isRead ? "" : "bg-primary/5"
			}`}
		>
			{respondsInline ? (
				<button
					type="button"
					onClick={() => {
						onMarkRead(notification.id);
						setShowRespondModal(true);
					}}
					className="flex min-w-0 flex-1 items-center gap-3 text-left"
				>
					{rowContent}
				</button>
			) : (
				<Link
					to={meta.href(notification)}
					onClick={() => onMarkRead(notification.id)}
					className="flex min-w-0 flex-1 items-center gap-3"
				>
					{rowContent}
				</Link>
			)}

			{respondsInline && (
				<RespondRequestModal
					actor={showRespondModal ? (notification.actor ?? null) : null}
					onClose={() => setShowRespondModal(false)}
				/>
			)}

			{!notification.isRead && (
				<button
					type="button"
					aria-label={t("notifications.markAsRead")}
					onClick={() => onMarkRead(notification.id)}
					className="btn btn-circle btn-ghost btn-xs shrink-0"
				>
					<span className="size-2 rounded-full bg-primary" aria-hidden="true" />
				</button>
			)}
		</li>
	);
}
