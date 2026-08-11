import { UserRole } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";

export async function getMatchesForUser(userId: string, role: string) {
	if (role !== UserRole.artist && role !== UserRole.hirer)
		throw new Error(`getMatchesForUser called with unsupported role: ${role}`);
	const matches =
		role === UserRole.artist
			? await prisma.match.findMany({
					where: { artistId: userId },
					include: {
						gig: {
							select: {
								hirer: {
									select: {
										id: true,
										hirerProfile: {
											select: {
												organizationName: true,
											},
										},
									},
								},
							},
						},
					},
				})
			: await prisma.match.findMany({
					where: { gig: { hirerId: userId } },
					include: {
						artist: {
							select: { id: true, username: true },
						},
					},
				});
	return matches;
}
