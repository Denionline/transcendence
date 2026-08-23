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
		hirerAvatarUrl: gig.hirer?.avatarUrl ?? null,
		category: gig.category.slug,
		categoryLabel: gig.category.label,
		// `??` alone misses an explicitly empty string (as opposed to a genuinely
		// unset/null location) — both mean "nothing was specified" and should
		// fall back the same way.
		location: gig.location?.trim() ? gig.location : "Location TBD",
		rate: gig.rate,
		remoteOk: false,
		postedLabel: label,
		isNew,
		title: gig.title,
		description: gig.description ?? "",
		duration: "Flexible",
		tags: [],
		coverPhotoUrl: null,
	};
}
