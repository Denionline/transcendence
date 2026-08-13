import { UserRole } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { isUserOnline } from "../websocket/websocket.gateway.js";

export interface MatchSummary {
	matchId: string;
	otherUser: {
		id: string;
		displayName: string;
		avatarUrl: string | null;
		online: boolean;
	};
	gig: {
		id: string;
		title: string;
	};
}

export async function getMatchesForUser(userId: string, role: string): Promise<MatchSummary[]> {
	if (role !== UserRole.artist && role !== UserRole.hirer)
		throw new Error(`getMatchesForUser called with unsupported role: ${role}`);

	if (role === UserRole.artist) {
		const matches = await prisma.match.findMany({
			where: { artistId: userId },
			include: {
				gig: {
					select: {
						id: true,
						title: true,
						hirer: {
							select: {
								id: true,
								avatarUrl: true,
								hirerProfile: { select: { organizationName: true } },
							},
						},
					},
				},
			},
		});
		return matches.map((match) => ({
			matchId: match.id,
			otherUser: {
				id: match.gig.hirer.id,
				displayName: match.gig.hirer.hirerProfile?.organizationName ?? "",
				avatarUrl: match.gig.hirer.avatarUrl,
				online: isUserOnline(match.gig.hirer.id, match.id),
			},
			gig: { id: match.gig.id, title: match.gig.title },
		}));
	}

	const matches = await prisma.match.findMany({
		where: { gig: { hirerId: userId } },
		include: {
			gig: { select: { id: true, title: true } },
			artist: { select: { id: true, username: true, avatarUrl: true } },
		},
	});
	return matches.map((match) => ({
		matchId: match.id,
		otherUser: {
			id: match.artist.id,
			displayName: match.artist.username,
			avatarUrl: match.artist.avatarUrl,
			online: isUserOnline(match.artist.id, match.id),
		},
		gig: { id: match.gig.id, title: match.gig.title },
	}));
}
