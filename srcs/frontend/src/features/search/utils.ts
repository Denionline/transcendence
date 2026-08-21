import type { PublicProfileDto } from "./types";

/** A hirer's public identity is their organization, not their personal
 *  username — GET /profile/:id never even joins the user for a hirer. */
export function profileDisplayName(profile: PublicProfileDto): string {
	if (profile.role === "hirer") return profile.organizationName || "Unnamed";
	return profile.user?.username ?? "Unnamed";
}
