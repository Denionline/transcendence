import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";
import { useAuth } from "../features/auth/hooks/useAuth";
import { getGig, updateGigStatus } from "../features/gigs/api";
import { formatDate } from "../lib/format";
import { ApiError } from "../lib/apiClient";
import type { GigDto } from "../features/gigs/types";

export default function OpportunityDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const navigate = useNavigate();

	const [gig, setGig] = useState<GigDto | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

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
				setError(
					err instanceof ApiError
						? err.message
						: "Couldn't load this opportunity. Please try again.",
				);
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, [id]);

	const isOwner = Boolean(gig && user && gig.hirerId === user.id);

	async function toggleStatus() {
		if (!gig) return;
		setIsUpdating(true);
		try {
			const updated = await updateGigStatus(gig.id, gig.status === "open" ? "closed" : "open");
			setGig(updated);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Couldn't update this opportunity.");
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
				My opportunities
			</button>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">Couldn&rsquo;t load this opportunity</p>
					<p className="text-error/80">{error}</p>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					Loading…
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
									{gig.status === "open" ? "Open" : "Closed"}
								</span>
							</div>
							<p className="text-sm text-base-content/50">
								{gig.category.label} · {gig.location ?? "Location TBD"} · Posted{" "}
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
								Search related artists
							</Link>
							<button
								type="button"
								onClick={toggleStatus}
								disabled={isUpdating}
								className="btn btn-outline rounded-full border-base-content/15"
							>
								{isUpdating
									? "Updating…"
									: gig.status === "open"
										? "Close opportunity"
										: "Reopen opportunity"}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
