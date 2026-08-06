import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { AuthenticatedUser } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { ArtistProfile, Prisma } from "../../../generated/prisma/client.js";
import { getGigById as getPublicGig, publicGigSelect } from "../gigs/gigs.service.js";
import { publicArtistSelect } from "../profile/profile.service.js";

interface SwipeData {
	swiperId: string;
	swipedId: string;
	artistId: string;
	gigId: string;
	liked: boolean;
}

async function getOpenGig(id: string) {
	const gig = await getPublicGig(id);
	if (gig.status !== "open") throwError(409, "GIG_CLOSED", "this gig is no longer open");
	return gig;
}

async function createSwipeRow(tx: Prisma.TransactionClient, data: SwipeData) {
	try {
		await tx.swipe.create({
			data: {
				swiperId: data.swiperId,
				swipedId: data.swipedId,
				gigId: data.gigId,
				liked: data.liked,
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			throwError(409, "SWIPE_EXISTS", "you already swiped this gig");
		}
		throw error;
	}
}

async function verifyDuplicate(data: SwipeData) {
	const existing = await prisma.swipe.findUnique({
		where: {
			gigId_swipedId_swiperId: {
				swiperId: data.swiperId,
				swipedId: data.swipedId,
				gigId: data.gigId,
			},
		},
	});
	if (existing) throwError(409, "SWIPE_EXISTS", "you already swiped this gig");
}

async function validateMatch(
	tx: Prisma.TransactionClient,
	data: SwipeData,
): Promise<string | undefined> {
	const match = await tx.swipe.findUnique({
		where: {
			gigId_swipedId_swiperId: {
				gigId: data.gigId,
				swipedId: data.swiperId,
				swiperId: data.swipedId,
			},
		},
	});
	if (!match || match.liked === false) return undefined;
	try {
		const created = await tx.match.create({
			data: { gigId: data.gigId, artistId: data.artistId },
		});
		return created.id;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			const existing = await tx.match.findUnique({
				where: { artistId_gigId: { artistId: data.artistId, gigId: data.gigId } },
			});
			return existing?.id;
		}
		throw error;
	}
}

async function verifyCategoryMatch(userId: string, gigCategory: string) {
	const profile = await prisma.artistProfile.findUnique({
		where: { userId },
	});
	if (!profile) throwError(404, "PROFILE_NOT_FOUND", "artist profile not found");
	if (profile.category !== gigCategory)
		throwError(400, "CATEGORY_MISMATCH", "category doesn't match the gig");
	return profile;
}

async function verifyArtistAvailability(profile: ArtistProfile) {
	if (profile.availability === false)
		throwError(409, "ARTIST_UNAVAILABLE", "this artist is not currently available");
}

export async function handleSwipe(
	swiper: AuthenticatedUser,
	gigId: string,
	liked: boolean,
	targetUserId?: string,
) {
	if (swiper.role !== UserRole.artist && swiper.role !== UserRole.hirer) {
		throwError(403, "FORBIDDEN", "only artists and hirers can swipe");
	}
	const data: Partial<SwipeData> = {};
	data.swiperId = swiper.id;
	data.gigId = gigId;
	data.liked = liked;
	const gig = await getOpenGig(gigId);
	if (swiper.role === UserRole.artist) {
		data.swipedId = gig.hirerId;
		data.artistId = swiper.id;
		await verifyCategoryMatch(data.swiperId, gig.category);
	} else {
		if (!targetUserId) throwError(400, "VALIDATION_ERROR", "targetUserId is required");
		if (gig.hirerId !== swiper.id) {
			throwError(403, "FORBIDDEN", "this gig doesn't belong to you");
		}
		data.swipedId = targetUserId;
		data.artistId = targetUserId;
		await verifyArtistAvailability(await verifyCategoryMatch(targetUserId, gig.category));
	}
	await verifyDuplicate(data as SwipeData);
	const matchId = await prisma.$transaction(async (tx) => {
		await createSwipeRow(tx, data as SwipeData);
		if (data.liked !== true) return undefined;
		return validateMatch(tx, data as SwipeData);
	});
	return { matchId };
}

async function getNextGigForArtist(user: AuthenticatedUser, excludeIds: string[]) {
	const artist = await prisma.artistProfile.findUnique({ where: { userId: user.id } });
	if (!artist) throwError(404, "PROFILE_NOT_FOUND", "artist profile not found");
	const gig = await prisma.gig.findFirst({
		where: {
			status: "open",
			category: artist.category,
			swipes: { none: { swiperId: user.id } },
			...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
		},
		orderBy: { createdAt: "asc" },
		select: publicGigSelect,
	});
	if (!gig) throwError(404, "NO_MORE_CANDIDATES", "no more gigs to show");
	return gig;
}

async function getNextCandidateForHirer(
	user: AuthenticatedUser,
	gigId: string,
	excludeIds: string[],
) {
	const gig = await getOpenGig(gigId);
	if (gig.hirerId !== user.id) throwError(403, "FORBIDDEN", "this gig doesn't belong to you");
	const artist = await prisma.artistProfile.findFirst({
		where: {
			category: gig.category,
			availability: true,
			user: {
				swipesReceived: { none: { swiperId: user.id, gigId } },
			},
			...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
		},
		orderBy: { createdAt: "asc" },
		select: publicArtistSelect,
	});
	if (!artist) throwError(404, "NO_MORE_CANDIDATES", "no more candidates to show");
	return artist;
}

export async function handleNext(
	user: AuthenticatedUser,
	gigId: string | undefined,
	excludeIds: string[] = [],
) {
	if (user.role !== UserRole.artist && user.role !== UserRole.hirer) {
		throwError(403, "FORBIDDEN", "only artists and hirers can browse swipe candidates");
	}
	if (user.role === UserRole.artist) return await getNextGigForArtist(user, excludeIds);
	if (!gigId) throwError(400, "VALIDATION_ERROR", "gigId is required");
	return await getNextCandidateForHirer(user, gigId, excludeIds);
}

/**
 * Artists who swiped "interested" (liked=true) on one of the caller's gigs.
 * `gigId` narrows to a single opportunity; omitted, it spans every gig the
 * hirer owns. `swiperId: { not: user.id }` is what actually isolates
 * artist-authored swipes — a hirer's own swipe on a candidate (recorded
 * against the same gig) always has the hirer as swiper, so excluding rows
 * they authored themselves is enough without needing a role check per row.
 */
export async function listInterestedArtists(user: AuthenticatedUser, gigId?: string) {
	if (user.role !== UserRole.hirer) {
		throwError(403, "FORBIDDEN", "only hirers can view interested artists");
	}
	if (gigId) {
		const gig = await getPublicGig(gigId);
		if (gig.hirerId !== user.id) throwError(403, "FORBIDDEN", "this gig doesn't belong to you");
	}

	const swipes = await prisma.swipe.findMany({
		where: {
			liked: true,
			swiperId: { not: user.id },
			gig: { hirerId: user.id, ...(gigId ? { id: gigId } : {}) },
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			createdAt: true,
			gig: { select: { id: true, title: true, status: true } },
			swiper: { select: { artistProfile: { select: publicArtistSelect } } },
		},
	});

	return swipes
		.filter((swipe) => swipe.swiper.artistProfile !== null)
		.map((swipe) => ({
			swipeId: swipe.id,
			createdAt: swipe.createdAt,
			gig: swipe.gig,
			artist: swipe.swiper.artistProfile!,
		}));
}
