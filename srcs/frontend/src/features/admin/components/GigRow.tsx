import { Trash2 } from "lucide-react";
import type { GigDto } from "../../gigs/types";
import { formatDate } from "../../../lib/format";
import Avatar from "../../../components/Avatar";
import { useTranslation } from "react-i18next";

export default function GigRow({ gig, onDelete }: { gig: GigDto; onDelete: () => void }) {
	const { t } = useTranslation();
	const meta = [gig.category.label, gig.location ?? undefined].filter(Boolean).join(" · ");

	return (
		<tr>
			<td>
				<div className="min-w-0">
					<div className="truncate font-bold">{gig.title}</div>
					<div className="truncate text-sm opacity-50">{meta}</div>
				</div>
			</td>
			<td>
				{gig.hirer ? (
					<div className="flex items-center gap-2">
						<Avatar username={gig.hirer.username} avatarUrl={gig.hirer.avatarUrl} size="sm" />
						<span className="truncate text-sm">{gig.hirer.username}</span>
					</div>
				) : (
					<span className="text-sm opacity-50">—</span>
				)}
			</td>
			<td>
				<span
					className={`badge badge-sm ${gig.status === "open" ? "badge-primary" : "badge-ghost"}`}
				>
					{gig.status === "open" ? t("gig.open") : t("gig.closed")}
				</span>
			</td>
			<td className="text-sm opacity-70">{formatDate(gig.createdAt)}</td>
			<td>
				<div className="flex justify-end">
					<button
						type="button"
						className="btn btn-ghost btn-xs text-error tooltip tooltip-left"
						data-tip={t("adminGigs.deleteGig")}
						aria-label={t("adminGigs.deleteNamed", { title: gig.title })}
						onClick={onDelete}
					>
						<Trash2 className="size-4" aria-hidden="true" />
					</button>
				</div>
			</td>
		</tr>
	);
}
