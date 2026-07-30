import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { AuthenticatedUser } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { ArtistProfile, Prisma } from "../../../generated/prisma/client.js";

interface SwipeData {
	swiperId: string;
	swipedId: string;
	artistId: string;
	gigId: string;
	liked: boolean;
}

async function getGigById(id: string) {
	const gig = await prisma.gig.findUnique({ where: { id } });
	if (!gig) throwError(404, "GIG_NOT_FOUND", "gig not found");
	if (gig.status !== "open") throwError(409, "GIG_CLOSED", "this gig is no longer open");
	return gig;
}

async function createSwipeRow(data: SwipeData) {
	try {
		await prisma.swipe.create({
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

async function validateMatch(data: SwipeData): Promise<string | undefined> {
	const match = await prisma.swipe.findUnique({
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
		const created = await prisma.match.create({
			data: { gigId: data.gigId, artistId: data.artistId },
		});
		return created.id;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			const existing = await prisma.match.findUnique({
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
	const gig = await getGigById(gigId);
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
	await createSwipeRow(data as SwipeData);
	if (data.liked !== true) return { matchId: undefined };
	const matchId = await validateMatch(data as SwipeData);
	return { matchId };
}
