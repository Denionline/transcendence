import { useEffect, useRef, useState } from "react";
import { MessageSquareIcon } from "lucide-react";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import MessagesDropdown from "./MessagesDropdown";
import { useTranslation } from "react-i18next";

const BUMP_DURATION_MS = 500;

export default function MessagesIcon() {
	const { t } = useTranslation();
	const { unreadCount, bumpToken } = useUnreadMessages();
	const [isBumping, setIsBumping] = useState(false);
	// Skip the animation on first mount — bumpToken starts at 0, but a
	// provider re-render (e.g. StrictMode) shouldn't play it for "no new
	// message" the way an actual increment should.
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
				aria-label={t("messages.title")}
				className="btn btn-ghost btn-circle relative"
			>
				<MessageSquareIcon
					className={`size-5 ${isBumping ? "animate-[icon-bump_500ms_ease-out]" : ""}`}
					aria-hidden="true"
				/>
				{unreadCount > 0 && (
					<span className="badge badge-sm badge-error absolute -top-1 -right-1 px-1">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</div>
			<div
				tabIndex={0}
				className="dropdown-content z-40 mt-3 w-80 rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg sm:w-96"
			>
				<MessagesDropdown />
			</div>
		</div>
	);
}
