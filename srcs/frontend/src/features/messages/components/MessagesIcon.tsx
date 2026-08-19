import { MessageSquareIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useUnreadMessages } from "../hooks/useUnreadMessages";

export default function MessagesIcon() {
	const { unreadCount } = useUnreadMessages();

	return (
		<Link
			to="/messages"
			aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
			className="btn btn-ghost btn-circle relative"
		>
			<MessageSquareIcon className="size-5" aria-hidden="true" />
			{unreadCount > 0 && (
				<span className="badge badge-sm badge-error absolute -top-1 -right-1 px-1">
					{unreadCount > 99 ? "99+" : unreadCount}
				</span>
			)}
		</Link>
	);
}
