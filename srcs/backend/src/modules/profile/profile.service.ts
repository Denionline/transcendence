import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { Prisma, UserRole } from "../../../generated/prisma/client.js";
import { publicCategorySelect, resolveCategoryIds } from "../categories/categories.service.js";
import { listPublicFilesFor } from "../files/files.service.js";
import { getFriendshipStatus } from "../friends/friends.service.js";
import type { UpdateProfileBody } from "./profile.schema.js";

export type ArtistProfileInput = Pick<
	UpdateProfileBody,
	"categories" | "bio" | "location" | "availability"
>;

export type HirerProfileInput = ArtistProfileInput & Pick<UpdateProfileBody, "organizationName">;

const categoriesSelect = {
	select: { category: { select: publicCategorySelect } },
};

export const publicArtistSelect = {
	id: true,
	userId: true,
	bio: true,
	location: true,
	availability: true,
	categories: categoriesSelect,
	user: { select: { username: true, avatarUrl: true } },
} satisfies Prisma.ArtistProfileSelect;

const publicHirerSelect = {
	id: true,
	userId: true,
	organizationName: true,
	bio: true,
	location: true,
	availability: true,
	categories: categoriesSelect,
	user: { select: { username: true, avatarUrl: true } },
} satisfies Prisma.HirerProfileSelect;

//	Prisma nests the join row, but nobody outside wants to see it: a profile
//	carries a flat list of categories.
interface WithCategoryRows {
	categories: { category: { id: string; slug: string; label: string } }[];
}

export function flattenCategories<T extends WithCategoryRows>(profile: T) {
	return { ...profile, categories: profile.categories.map((row) => row.category) };
}

interface ProfileFields {
	bio?: string | null;
	location?: string | null;
	availability?: boolean;
	organizationName?: string;
}

function applyCommonFields(data: ProfileFields, input: ArtistProfileInput) {
	if (input.bio !== undefined) data.bio = input.bio;
	if (input.location !== undefined) data.location = input.location;
	if (input.availability !== undefined) data.availability = input.availability;
}

function requireCategoriesOnCreate(exists: boolean, categoryIds: string[] | undefined) {
	if (exists === true) return;
	if (categoryIds !== undefined) return;
	throwError(
		400,
		"VALIDATION_ERROR",
		"categories is required when creating a profile for the first time",
	);
}

export async function upsertArtistProfile(userId: string, input: ArtistProfileInput) {
	const data: ProfileFields = {};
	let categoryIds: string[] | undefined;

	if (input.categories !== undefined) categoryIds = await resolveCategoryIds(input.categories);
	applyCommonFields(data, input);

	const existing = await prisma.artistProfile.findUnique({
		where: { userId },
		select: { id: true },
	});
	requireCategoriesOnCreate(existing !== null, categoryIds);

	await prisma.$transaction(async (tx) => {
		const profile = existing
			? await tx.artistProfile.update({ where: { userId }, data, select: { id: true } })
			: await tx.artistProfile.create({ data: { userId, ...data }, select: { id: true } });

		if (categoryIds === undefined) return;
		await tx.artistCategory.deleteMany({ where: { artistProfileId: profile.id } });
		await tx.artistCategory.createMany({
			data: categoryIds.map((categoryId) => ({ artistProfileId: profile.id, categoryId })),
		});
	});

	return await getArtistProfile(userId);
}

export async function upsertHirerProfile(userId: string, input: HirerProfileInput) {
	const data: ProfileFields = {};
	let categoryIds: string[] | undefined;

	if (input.categories !== undefined) categoryIds = await resolveCategoryIds(input.categories);
	if (input.organizationName !== undefined) data.organizationName = input.organizationName;
	applyCommonFields(data, input);

	const existing = await prisma.hirerProfile.findUnique({
		where: { userId },
		select: { id: true },
	});
	if (existing === null && data.organizationName === undefined)
		throwError(
			400,
			"VALIDATION_ERROR",
			"organizationName is required when creating a profile for the first time",
		);
	// Unlike artists, a hirer's own category was never read by anything —
	// matching runs on each gig's category (see verifyCategoryMatch), not the
	// hirer's profile — so creating one doesn't require picking a category.
	// `categoryIds` is still honored if a caller sends it, for any old data.

	await prisma.$transaction(async (tx) => {
		const profile = existing
			? await tx.hirerProfile.update({ where: { userId }, data, select: { id: true } })
			: await tx.hirerProfile.create({
					data: { userId, ...data, organizationName: data.organizationName! },
					select: { id: true },
				});

		if (categoryIds === undefined) return;
		await tx.hirerCategory.deleteMany({ where: { hirerProfileId: profile.id } });
		await tx.hirerCategory.createMany({
			data: categoryIds.map((categoryId) => ({ hirerProfileId: profile.id, categoryId })),
		});
	});

	return await getHirerProfile(userId);
}

async function getArtistProfile(userId: string) {
	const profile = await prisma.artistProfile.findUnique({
		where: { userId },
		select: publicArtistSelect,
	});
	if (!profile) throwError(404, "PROFILE_NOT_FOUND", "artist profile not found");
	const portfolio = await listPublicFilesFor(userId);
	return { ...flattenCategories(profile), portfolio };
}

async function getHirerProfile(userId: string) {
	const profile = await prisma.hirerProfile.findUnique({
		where: { userId },
		select: publicHirerSelect,
	});
	if (!profile) throwError(404, "PROFILE_NOT_FOUND", "hirer profile not found");
	const portfolio = await listPublicFilesFor(userId);
	return { ...flattenCategories(profile), portfolio };
}

//	The caller checking their own onboarding status — from ProfileOnboardingGate
//	on every page, before they may have ever created a profile — is a normal,
//	expected state, not an error. Unlike getCallerProfile (used for GET
//	/profile/:id, where "no profile" on a real target legitimately 404s),
//	this always answers 200 so a brand-new account's very first page load
//	never logs a network failure to the console over something this routine.
export async function getMyProfile(caller: { id: string; role: UserRole }) {
	if (caller.role !== UserRole.artist && caller.role !== UserRole.hirer) {
		throwError(403, "FORBIDDEN", "this role does not have an artist/hirer profile");
	}
	const isArtist = caller.role === UserRole.artist;
	const role = isArtist ? ("artist" as const) : ("hirer" as const);

	const profile = isArtist
		? await prisma.artistProfile.findUnique({
				where: { userId: caller.id },
				select: publicArtistSelect,
			})
		: await prisma.hirerProfile.findUnique({
				where: { userId: caller.id },
				select: publicHirerSelect,
			});
	if (!profile) return { exists: false as const, role };

	const portfolio = await listPublicFilesFor(caller.id);
	return { exists: true as const, role, ...flattenCategories(profile), portfolio };
}

export async function getCallerProfile(targetId: string, callerId: string) {
	const profile = await prisma.user.findUnique({ where: { id: targetId } });
	if (!profile) throwError(404, "USER_NOT_FOUND", "no user with that id");
	if (profile.role === UserRole.admin)
		throwError(404, "PROFILE_NOT_FOUND", "admin accounts don't have an artist/hirer profile");

	const isArtist = profile.role === UserRole.artist;
	const base = isArtist ? await getArtistProfile(targetId) : await getHirerProfile(targetId);
	const result = { role: isArtist ? ("artist" as const) : ("hirer" as const), ...base };

	if (callerId === targetId) return result;
	const friendshipStatus = await getFriendshipStatus(callerId, targetId);
	return { ...result, friendshipStatus };
}

export async function deleteProfile(targetId: string) {
	const profile = await prisma.user.findUnique({ where: { id: targetId } });
	if (!profile) throwError(404, "USER_NOT_FOUND", "no user with that id");
	try {
		if (profile.role === UserRole.artist) {
			await prisma.artistProfile.delete({ where: { userId: targetId } });
		} else {
			await prisma.hirerProfile.delete({ where: { userId: targetId } });
		}
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
			throwError(404, "PROFILE_NOT_FOUND", "profile not found");
		throw error;
	}
}
