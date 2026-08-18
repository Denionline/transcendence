import Avatar from "../../../components/Avatar";
import type { MatchDto } from "../../matches/types";

interface ConversationListProps {
	matches: MatchDto[];
	selectedMatchId: string | null;
	onSelect: (matchId: string) => void;
}

export default function ConversationList({
	matches,
	selectedMatchId,
	onSelect,
}: ConversationListProps) {
	if (matches.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center text-base-content/50">
				<p className="font-medium">No matches yet</p>
				<p className="text-sm">Once you match with someone, they&rsquo;ll show up here.</p>
			</div>
		);
	}

	return (
		<ul className="flex flex-col gap-1 overflow-y-auto p-2">
			{matches.map((match) => {
				const isSelected = match.matchId === selectedMatchId;
				return (
					<li key={match.matchId}>
						<button
							type="button"
							onClick={() => onSelect(match.matchId)}
							aria-current={isSelected}
							className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
								isSelected ? "bg-primary/10" : "hover:bg-base-200"
							}`}
						>
							<div className="relative shrink-0">
								<Avatar
									username={match.otherUser.displayName}
									avatarUrl={match.otherUser.avatarUrl}
									size="md"
								/>
								{match.otherUser.online && (
									<span
										className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-base-100 bg-success"
										aria-label="Online"
									/>
								)}
							</div>
							<div className="min-w-0">
								<p className="truncate font-medium">{match.otherUser.displayName}</p>
								<p className="truncate text-sm text-base-content/50">{match.gig.title}</p>
							</div>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
