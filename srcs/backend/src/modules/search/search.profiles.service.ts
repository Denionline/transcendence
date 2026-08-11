import { Prisma, UserRole } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const MAX_RESULTS = 20;

const searchProfileSelect = {
	id: true,
	username: true,
	avatarUrl: true,
	role: true,
} satisfies Prisma.UserSelect;

export interface SearchProfilesOptions {
	callerId: string;
	q: string;
}

/** Name-only search across artist and hirer accounts, for the navbar search box. */
export async function searchProfiles({ callerId, q }: SearchProfilesOptions) {
	const users = await prisma.user.findMany({
		where: {
			id: { not: callerId },
			role: { in: [UserRole.artist, UserRole.hirer] },
			username: { contains: q, mode: "insensitive" },
		},
		select: searchProfileSelect,
		orderBy: { username: "asc" },
		take: MAX_RESULTS,
	});

	return users.map((user) => ({
		userId: user.id,
		username: user.username,
		avatarUrl: user.avatarUrl,
		role: user.role,
	}));
}
