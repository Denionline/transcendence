import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, MessageCircleIcon, SearchIcon } from "lucide-react";
import Avatar from "../components/Avatar";
import { useAuth } from "../features/auth/hooks/useAuth";
import { getGig, updateGigStatus } from "../features/gigs/api";
import { listMatches } from "../features/matches/api";
import { formatDate } from "../lib/format";
import { ApiError } from "../lib/apiClient";
import type { GigDto } from "../features/gigs/types";
import type { MatchDto } from "../features/matches/types";
import { useTranslation } from "react-i18next";

export default function OpportunityDetailPage() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const navigate = useNavigate();

	const [gig, setGig] = useState<GigDto | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	// A gig closes automatically the moment it matches (see swipe.service.ts),
	// and there's currently no way to undo a match — so once matched, "Reopen"
	// has to stay off the table rather than let the hirer bypass a closed
	// match into a still-open gig.
	const [gigMatches, setGigMatches] = useState<MatchDto[]>([]);
	const hasMatch = gigMatches.length > 0;

	useEffect(() => {
		if (!id) return;
		let cancelled = false;
		getGig(id)
			.then((dto) => {
				if (cancelled) return;
				setGig(dto);
				setStatus("ready");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof ApiError ? err.message : "gig.loadFailed");
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, [id]);

	useEffect(() => {
		if (!gig) return;
		let cancelled = false;
		listMatches()
			.then((matches) => {
				if (cancelled) return;
				setGigMatches(matches.filter((match) => match.gig.id === gig.id));
			})
			.catch(() => {
				// Worst case hasMatch stays false and the page treats this gig as
				// not yet matched — an acceptable fallback for a background check.
			});
		return () => {
			cancelled = true;
		};
	}, [gig]);

	const isOwner = Boolean(gig && user && gig.hirerId === user.id);

	async function toggleStatus() {
		if (!gig) return;
		setIsUpdating(true);
		try {
			const updated = await updateGigStatus(gig.id, gig.status === "open" ? "closed" : "open");
			setGig(updated);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "gig.updateFailed");
		} finally {
			setIsUpdating(false);
		}
	}

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			<button
				type="button"
				onClick={() => navigate("/opportunities/mine")}
				className="btn btn-ghost btn-sm w-fit gap-2 px-0"
			>
				<ArrowLeftIcon className="size-4" aria-hidden="true" />
				{t("gig.myOpportunities")}
			</button>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">{t("gig.couldntLoadOne")}</p>
					<p className="text-error/80">{error ? t(error) : null}</p>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					{t("gig.loading")}
				</div>
			)}

			{status === "ready" && gig && (
				<div className="flex flex-col gap-6 rounded-2xl border border-base-content/10 bg-base-100 p-6">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<div className="mb-1 flex items-center gap-2">
								<h1 className="text-xl font-semibold">{gig.title}</h1>
								<span
									className={`badge badge-sm font-medium ${
										gig.status === "open" ? "badge-primary" : "badge-ghost"
									}`}
								>
									{gig.status === "open" ? t("gig.open") : t("gig.closed")}
								</span>
							</div>
							<p className="text-sm text-base-content/50">
								{gig.category.label} · {gig.location ?? t("gig.locationTbd")} · {t("gig.posted")}{" "}
								{formatDate(gig.createdAt)}
							</p>
						</div>
						{gig.rate != null && (
							<span className="badge badge-lg badge-outline border-base-content/15">
								€{gig.rate}
							</span>
						)}
					</div>

					{gig.description && (
						<p className="text-sm leading-relaxed text-base-content/70">{gig.description}</p>
					)}

					{isOwner && gigMatches.length > 0 && (
						<div className="flex flex-col gap-2 border-t border-base-content/10 pt-4">
							<p className="text-sm font-medium text-base-content/70">
								{t("gig.matchedArtist", { count: gigMatches.length })}
							</p>
							<ul className="flex flex-col gap-2">
								{gigMatches.map((match) => (
									<li
										key={match.matchId}
										className="flex items-center justify-between gap-3 rounded-xl border border-base-content/10 p-3"
									>
										<Link
											to={`/profile/${match.otherUser.id}`}
											className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
										>
											<div className="relative shrink-0">
												<Avatar
													username={match.otherUser.displayName}
													avatarUrl={match.otherUser.avatarUrl}
													size="sm"
												/>
												{match.otherUser.online && (
													<span
														className="absolute right-0 bottom-0 size-2 rounded-full border-2 border-base-100 bg-success"
														aria-label={t("matches.online")}
													/>
												)}
											</div>
											<span className="truncate font-medium">{match.otherUser.displayName}</span>
										</Link>
										<Link
											to={`/messages?matchId=${match.matchId}`}
											aria-label={t("matches.goToChat", { name: match.otherUser.displayName })}
											className="btn btn-sm btn-primary shrink-0 gap-1.5 rounded-full"
										>
											<MessageCircleIcon className="size-4" aria-hidden="true" />
											{t("matches.chat")}
										</Link>
									</li>
								))}
							</ul>
						</div>
					)}

					{isOwner && (
						<div className="flex flex-wrap gap-2 border-t border-base-content/10 pt-4">
							<Link
								to={`/discover?gigId=${gig.id}`}
								className="btn btn-primary rounded-full"
								aria-disabled={gig.status !== "open"}
								onClick={(e) => {
									if (gig.status !== "open") e.preventDefault();
								}}
							>
								<SearchIcon className="size-4" aria-hidden="true" />
								{t("gig.searchRelatedArtists")}
							</Link>
							{gig.status === "closed" && hasMatch ? (
								<button
									type="button"
									disabled
									aria-label={t("gig.matchedStaysClosed")}
									className="btn btn-outline tooltip rounded-full border-base-content/15 opacity-50"
									data-tip={t("gig.matchedStaysClosed")}
								>
									{t("gig.reopenOpportunity")}
								</button>
							) : (
								<button
									type="button"
									onClick={toggleStatus}
									disabled={isUpdating}
									className="btn btn-outline rounded-full border-base-content/15"
								>
									{isUpdating
										? t("gig.updating")
										: gig.status === "open"
											? t("gig.closeOpportunity")
											: t("gig.reopenOpportunity")}
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
