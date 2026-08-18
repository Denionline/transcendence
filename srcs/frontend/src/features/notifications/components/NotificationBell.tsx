import { BellIcon } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
	const { unreadCount } = useNotifications();

	return (
		<div className="dropdown dropdown-end">
			<div
				tabIndex={0}
				role="button"
				aria-label="Notifications"
				className="btn btn-ghost btn-circle relative"
			>
				<BellIcon className="size-5" aria-hidden="true" />
				{unreadCount > 0 && (
					<span className="badge badge-sm badge-error absolute -top-1 -right-1 px-1">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</div>
			<div
				tabIndex={0}
				className="dropdown-content z-1 mt-3 w-80 rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg sm:w-96"
			>
				<NotificationDropdown />
			</div>
		</div>
	);
}
