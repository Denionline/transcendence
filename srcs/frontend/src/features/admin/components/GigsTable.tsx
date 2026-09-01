import type { GigDto } from "../../gigs/types";
import GigRow from "./GigRow";
import { useTranslation } from "react-i18next";

interface GigsTableProps {
	gigs: GigDto[];
	isLoading: boolean;
	onDelete: (id: string) => void;
}

export default function GigsTable({ gigs, isLoading, onDelete }: GigsTableProps) {
	const { t } = useTranslation();

	return (
		<table className="table">
			<thead>
				<tr>
					<th>{t("adminGigs.gig")}</th>
					<th>{t("adminGigs.hirer")}</th>
					<th>{t("adminGigs.status")}</th>
					<th>{t("adminGigs.created")}</th>
					<th className="text-right">{t("adminGigs.actions")}</th>
				</tr>
			</thead>
			<tbody>
				{isLoading && (
					<tr>
						<td colSpan={5} className="py-10 text-center">
							<span className="loading loading-spinner loading-md" />
						</td>
					</tr>
				)}

				{!isLoading && gigs.length === 0 && (
					<tr>
						<td colSpan={5} className="py-10 text-center text-sm text-base-content/60">
							{t("adminGigs.none")}
						</td>
					</tr>
				)}

				{!isLoading &&
					gigs.map((gig) => <GigRow key={gig.id} gig={gig} onDelete={() => onDelete(gig.id)} />)}
			</tbody>
		</table>
	);
}
