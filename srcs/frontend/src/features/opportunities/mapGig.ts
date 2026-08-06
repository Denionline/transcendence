import type { GigDto } from "../gigs/types";
import type { GigListing } from "./gigTypes";

const DAY_MS = 24 * 60 * 60 * 1000;

function postedLabel(createdAt: string): { label: string; isNew: boolean } {
	const ageMs = Date.now() - new Date(createdAt).getTime();
	const isNew = ageMs < 2 * DAY_MS;
	if (ageMs < DAY_MS) return { label: "New today", isNew };
	const days = Math.floor(ageMs / DAY_MS);
	return { label: `${days}d ago`, isNew };
}

export function mapGigToListing(gig: GigDto): GigListing {
	const { label, isNew } = postedLabel(gig.createdAt);
	return {
		id: gig.id,
		hirerName: gig.hirer?.username ?? "Unnamed hirer",
		category: gig.category,
		location: gig.location ?? "Location TBD",
		rate: gig.rate,
		remoteOk: false,
		postedLabel: label,
		isNew,
		title: gig.title,
		description: gig.description ?? "",
		budget: gig.rate != null ? `€${gig.rate}` : "Rate on request",
		duration: "Flexible",
		tags: [],
		coverPhotoUrl: null,
	};
}
