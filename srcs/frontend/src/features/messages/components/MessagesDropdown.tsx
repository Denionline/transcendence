import { Link } from "react-router-dom";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import MessageListItem from "./MessageListItem";

const RECENT_LIMIT = 6;

export default function MessagesDropdown() {
	const { matches, status } = useUnreadMessages();
	const recent = matches.slice(0, RECENT_LIMIT);

	return (
		<div className="flex max-h-[70vh] flex-col">
			<div className="flex items-center justify-between px-2 pb-2">
				<span className="menu-title px-0">Messages</span>
			</div>

			{status === "loading" && (
				<div className="flex h-24 items-center justify-center text-sm text-base-content/50">
					Loading…
				</div>
			)}

			{status === "error" && (
				<div className="flex h-24 items-center justify-center px-2 text-center text-sm text-error">
					Couldn&rsquo;t load messages.
				</div>
			)}

			{status === "ready" && recent.length === 0 && (
				<div className="flex h-24 items-center justify-center px-2 text-center text-sm text-base-content/50">
					No conversations yet.
				</div>
			)}

			{status === "ready" && recent.length > 0 && (
				<ul className="flex flex-col gap-2 overflow-y-auto px-1">
					{recent.map((match) => (
						<MessageListItem key={match.matchId} match={match} />
					))}
				</ul>
			)}

			<div className="mt-2 border-t border-base-content/10 pt-2 text-center">
				<Link to="/messages" className="link text-sm font-medium link-primary">
					View all
				</Link>
			</div>
		</div>
	);
}
