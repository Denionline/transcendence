import type { UserRole } from "../auth/types";

export const ROLE_BADGE: Record<UserRole, string> = {
	admin: "badge-primary",
	hirer: "badge-secondary",
	artist: "badge-accent",
};
