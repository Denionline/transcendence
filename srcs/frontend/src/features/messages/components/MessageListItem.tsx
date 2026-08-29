import { Link } from "react-router-dom";
import Avatar from "../../../components/Avatar";
import { formatRelativeTime } from "../../../lib/format";
import type { MatchDto } from "../../matches/types";
import { useTranslation } from "react-i18next";

interface MessageListItemProps {
	match: MatchDto;
}

export default function MessageListItem({ match }: MessageListItemProps) {
	const { t } = useTranslation();
	const hasUnread = match.unreadCount > 0;

	return (
		<li
			className={`flex items-center gap-3 rounded-2xl border border-base-content/10 p-3 transition-colors ${
				hasUnread ? "bg-primary/5" : ""
			}`}
		>
			<Link
				to={`/messages?matchId=${match.matchId}`}
				className="flex min-w-0 flex-1 items-center gap-3"
			>
				<Avatar
					username={match.otherUser.displayName}
					avatarUrl={match.otherUser.avatarUrl}
					size="sm"
				/>
				<div className="min-w-0 flex-1">
					<p className="flex items-center justify-between gap-2">
						<span className="truncate text-sm font-medium">{match.otherUser.displayName}</span>
						{match.lastMessage && (
							<span className="shrink-0 text-xs text-base-content/50">
								{formatRelativeTime(match.lastMessage.createdAt)}
							</span>
						)}
					</p>
					<p className="truncate text-xs text-base-content/50">
						{match.lastMessage ? match.lastMessage.content : t("messages.sayHello")}
					</p>
				</div>
			</Link>

			{hasUnread && (
				<span
					className="size-2 shrink-0 rounded-full bg-primary"
					aria-label={t("messages.unread", { count: match.unreadCount })}
				/>
			)}
		</li>
	);
}
