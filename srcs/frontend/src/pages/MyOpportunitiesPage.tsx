import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { listMyGigs } from "../features/gigs/api";
import { formatDate } from "../lib/format";
import { ApiError } from "../lib/apiClient";
import type { GigDto } from "../features/gigs/types";

export default function MyOpportunitiesPage() {
	const [gigs, setGigs] = useState<GigDto[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		listMyGigs()
			.then((items) => {
				if (cancelled) return;
				setGigs(items);
				setStatus("ready");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(
					err instanceof ApiError
						? err.message
						: "Couldn't load your opportunities. Please try again.",
				);
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">My opportunities</h1>
					<p className="text-sm text-base-content/50">
						{status === "ready" ? `${gigs.length} posted` : "Loading…"}
					</p>
				</div>
				<Link to="/opportunities/new" className="btn btn-primary btn-sm rounded-full">
					<PlusIcon className="size-4" aria-hidden="true" />
					Post opportunity
				</Link>
			</div>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">Couldn&rsquo;t load your opportunities</p>
					<p className="text-error/80">{error}</p>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					Loading…
				</div>
			)}

			{status === "ready" && gigs.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<p className="font-medium">You haven&rsquo;t posted any opportunities yet</p>
					<Link to="/opportunities/new" className="btn btn-primary btn-sm mt-2 rounded-full">
						Post your first opportunity
					</Link>
				</div>
			)}

			{status === "ready" && gigs.length > 0 && (
				<ul className="flex flex-col gap-3">
					{gigs.map((gig) => (
						<li key={gig.id}>
							<Link
								to={`/opportunities/mine/${gig.id}`}
								className="group flex items-center justify-between gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
							>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<h2 className="truncate font-semibold">{gig.title}</h2>
										<span
											className={`badge badge-sm font-medium ${
												gig.status === "open" ? "badge-primary" : "badge-ghost"
											}`}
										>
											{gig.status === "open" ? "Open" : "Closed"}
										</span>
									</div>
									<p className="truncate text-sm text-base-content/50">
										{gig.category} · {gig.location ?? "Location TBD"} · Posted{" "}
										{formatDate(gig.createdAt)}
									</p>
								</div>
								<ChevronRightIcon
									className="size-4 shrink-0 text-base-content/30 transition-transform group-hover:translate-x-0.5"
									aria-hidden="true"
								/>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
