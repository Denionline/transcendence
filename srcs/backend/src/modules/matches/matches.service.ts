import { UserRole } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { isUserOnline } from "../websocket/websocket.gateway.js";

export interface MatchSummary {
	matchId: string;
	counterpartId: string;
	counterpartName: string;
	counterpartOnline: boolean;
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
						hirer: {
							select: {
								id: true,
								hirerProfile: { select: { organizationName: true } },
							},
						},
					},
				},
			},
		});
		return matches.map((match) => ({
			matchId: match.id,
			counterpartId: match.gig.hirer.id,
			counterpartName: match.gig.hirer.hirerProfile?.organizationName ?? "",
			counterpartOnline: isUserOnline(match.gig.hirer.id),
		}));
	}

	const matches = await prisma.match.findMany({
		where: { gig: { hirerId: userId } },
		include: {
			artist: { select: { id: true, username: true } },
		},
	});
	return matches.map((match) => ({
		matchId: match.id,
		counterpartId: match.artist.id,
		counterpartName: match.artist.username,
		counterpartOnline: isUserOnline(match.artist.id),
	}));
}
