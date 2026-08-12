import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { AuthenticatedUser } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { ArtistProfile, Prisma } from "../../../generated/prisma/client.js";
import { getGigById as getPublicGig, publicGigSelect } from "../gigs/gigs.service.js";
import { flattenCategories, publicArtistSelect } from "../profile/profile.service.js";
import { publicCategorySelect } from "../categories/categories.service.js";
import { buildMeta } from "../../lib/pagination.js";
import { authEvents } from "../../lib/auth-events.js";

interface SwipeData {
	swiperId: string;
	swipedId: string;
	artistId: string;
	gigId: string;
	liked: boolean;
}

export interface SwipeHistoryOptions {
	page: number;
	pageSize: number;
	liked?: boolean;
	gigId?: string;
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
		await tx.gig.update({
			where: { id: data.gigId },
			data: { status: "closed" },
		});
		authEvents.emit("new_match", { matchId: created.id, userIds: [data.swiperId, data.swipedId] });
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

//	Eligibility is now a set intersection on ids, not a string comparison: an
//	artist may hold several categories, and the gig's single one has to be
//	among them.
async function verifyCategoryMatch(userId: string, gigCategoryId: string) {
	const profile = await prisma.artistProfile.findUnique({
		where: { userId },
		include: { categories: { select: { categoryId: true } } },
	});
	if (!profile) throwError(404, "PROFILE_NOT_FOUND", "artist profile not found");

	let sharesCategory = false;
	for (const row of profile.categories) {
		if (row.categoryId === gigCategoryId) sharesCategory = true;
	}
	if (sharesCategory === false)
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
		await verifyCategoryMatch(data.swiperId, gig.categoryId);
	} else {
		if (!targetUserId) throwError(400, "VALIDATION_ERROR", "targetUserId is required");
		if (gig.hirerId !== swiper.id) {
			throwError(403, "FORBIDDEN", "this gig doesn't belong to you");
		}
		data.swipedId = targetUserId;
		data.artistId = targetUserId;
		await verifyArtistAvailability(await verifyCategoryMatch(targetUserId, gig.categoryId));
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
	const artist = await prisma.artistProfile.findUnique({
		where: { userId: user.id },
		include: { categories: { select: { categoryId: true } } },
	});
	if (!artist) throwError(404, "PROFILE_NOT_FOUND", "artist profile not found");

	//	The feed widens with every category the artist holds.
	const categoryIds = artist.categories.map((row) => row.categoryId);
	const gig = await prisma.gig.findFirst({
		where: {
			status: "open",
			categoryId: { in: categoryIds },
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
			categories: { some: { categoryId: gig.categoryId } },
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
	return flattenCategories(artist);
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

async function getArtistSwipeHistory(userId: string, data: SwipeHistoryOptions) {
	const where = {
		swiperId: userId,
		...(data.liked !== undefined ? { liked: data.liked } : {}),
	};
	const [items, total] = await prisma.$transaction([
		prisma.swipe.findMany({
			where,
			skip: (data.page - 1) * data.pageSize,
			take: data.pageSize,
			select: {
				liked: true,
				createdAt: true,
				swiped: {
					select: {
						avatarUrl: true,
						hirerProfile: { select: { organizationName: true } },
					},
				},
				gig: { select: publicGigSelect },
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.swipe.count({ where }),
	]);

	return { items, ...buildMeta(data.page, data.pageSize, total) };
}

async function getHirerSwipeHistory(userId: string, data: SwipeHistoryOptions) {
	const where = {
		swiperId: userId,
		...(data.liked !== undefined ? { liked: data.liked } : {}),
		...(data.gigId !== undefined ? { gigId: data.gigId } : {}),
	};

	const [items, total] = await prisma.$transaction([
		prisma.swipe.findMany({
			where,
			skip: (data.page - 1) * data.pageSize,
			take: data.pageSize,
			select: {
				liked: true,
				createdAt: true,
				gig: {
					select: {
						id: true,
						title: true,
						category: { select: publicCategorySelect },
						location: true,
					},
				},
				swiped: {
					select: {
						avatarUrl: true,
						username: true,
						artistProfile: { select: publicArtistSelect },
					},
				},
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.swipe.count({ where }),
	]);

	//	The join rows are an implementation detail of storage; the history feed
	//	hands back the same flat category list every other endpoint does.
	const flattened = items.map((item) => {
		if (!item.swiped.artistProfile) return item;
		const artistProfile = flattenCategories(item.swiped.artistProfile);
		return { ...item, swiped: { ...item.swiped, artistProfile } };
	});

	return { items: flattened, ...buildMeta(data.page, data.pageSize, total) };
}

export async function handleSwipeHistory(user: AuthenticatedUser, data: SwipeHistoryOptions) {
	if (user.role !== UserRole.artist && user.role !== UserRole.hirer) {
		throwError(403, "FORBIDDEN", "only artists and hirers can view swipe history");
	}
	if (user.role === UserRole.artist) return await getArtistSwipeHistory(user.id, data);
	return await getHirerSwipeHistory(user.id, data);
}
