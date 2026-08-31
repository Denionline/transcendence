import { useEffect, useRef, useState } from "react";
import { BellIcon } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";
import { useTranslation } from "react-i18next";

const BUMP_DURATION_MS = 500;

export default function NotificationBell() {
	const { t } = useTranslation();
	const { unreadCount, bumpToken } = useNotifications();
	const [isBumping, setIsBumping] = useState(false);
	// Skip the animation on first mount — bumpToken starts at 0, but a
	// provider re-render (e.g. StrictMode) shouldn't play it for "no new
	// notification" the way an actual push should.
	const mounted = useRef(false);

	useEffect(() => {
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		setIsBumping(true);
		const timeout = window.setTimeout(() => setIsBumping(false), BUMP_DURATION_MS);
		return () => window.clearTimeout(timeout);
	}, [bumpToken]);

	return (
		<div className="dropdown dropdown-end">
			<div
				tabIndex={0}
				role="button"
				aria-label={t("notifications.title")}
				className="btn btn-ghost btn-circle relative"
			>
				<BellIcon
					className={`size-5 ${isBumping ? "animate-[icon-bump_500ms_ease-out]" : ""}`}
					aria-hidden="true"
				/>
				{unreadCount > 0 && (
					<span className="badge badge-sm badge-error absolute -top-1 -right-1 px-1">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</div>
			<div
				tabIndex={0}
				className="dropdown-content z-40 mt-3 w-80 rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg sm:w-96"
			>
				<NotificationDropdown />
			</div>
		</div>
	);
}
