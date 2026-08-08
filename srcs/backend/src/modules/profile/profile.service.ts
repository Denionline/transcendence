import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { Prisma, UserRole } from "../../../generated/prisma/client.js";

export interface ArtistProfileInput {
	category?: unknown;
	bio?: unknown;
	location?: unknown;
	availability?: unknown;
}

export interface HirerProfileInput {
	category?: unknown;
	bio?: unknown;
	organizationName?: unknown;
	location?: unknown;
	availability?: unknown;
}

export const publicArtistSelect = {
	category: true,
	bio: true,
	location: true,
	availability: true,
} satisfies Prisma.ArtistProfileSelect;

const publicHirerSelect = {
	category: true,
	organizationName: true,
	bio: true,
	location: true,
	availability: true,
} satisfies Prisma.HirerProfileSelect;

async function addArtistProfileData(userId: string, data: Prisma.ArtistProfileUpdateInput) {
	const user = await prisma.artistProfile.findUnique({ where: { userId } });
	if (!user && data.category === undefined)
		throwError(
			400,
			"VALIDATION_ERROR",
			"category is required when creating a profile for the first time",
		);
	const profile = await prisma.artistProfile.upsert({
		where: { userId },
		update: data,
		create: { userId, ...data } as Prisma.ArtistProfileUncheckedCreateInput,
		select: publicArtistSelect,
	});
	return profile;
}

async function addHirerProfileData(userId: string, data: Prisma.HirerProfileUpdateInput) {
	const user = await prisma.hirerProfile.findUnique({ where: { userId } });
	if (!user && (data.category === undefined || data.organizationName === undefined))
		throwError(
			400,
			"VALIDATION_ERROR",
			"category and organizationName are required when creating a profile for the first time",
		);
	const profile = await prisma.hirerProfile.upsert({
		where: { userId },
		update: data,
		create: { userId, ...data } as Prisma.HirerProfileUncheckedCreateInput,
		select: publicHirerSelect,
	});
	return profile;
}

export async function upsertArtistProfile(userId: string, input: ArtistProfileInput) {
	const data: Prisma.ArtistProfileUpdateInput = {};

	if (input.category !== undefined) {
		if (typeof input.category !== "string")
			throwError(400, "VALIDATION_ERROR", "category must be a string");
		const category = input.category.trim();
		if (category.length === 0) throwError(400, "VALIDATION_ERROR", "category cannot be empty");
		data.category = category;
	}
	if (input.bio !== undefined) {
		if (input.bio !== null && typeof input.bio !== "string")
			throwError(400, "VALIDATION_ERROR", "bio must be a string or null");
		data.bio = input.bio;
	}
	if (input.location !== undefined) {
		if (input.location !== null && typeof input.location !== "string")
			throwError(400, "VALIDATION_ERROR", "location must be a string or null");
		data.location = input.location;
	}
	if (input.availability !== undefined) {
		if (typeof input.availability !== "boolean")
			throwError(400, "VALIDATION_ERROR", "availability must be a boolean");
		data.availability = input.availability;
	}
	return await addArtistProfileData(userId, data);
}

export async function upsertHirerProfile(userId: string, input: HirerProfileInput) {
	const data: Prisma.HirerProfileUpdateInput = {};

	if (input.category !== undefined) {
		if (typeof input.category !== "string")
			throwError(400, "VALIDATION_ERROR", "category must be a string");
		const category = input.category.trim();
		if (category.length === 0) throwError(400, "VALIDATION_ERROR", "category cannot be empty");
		data.category = category;
	}
	if (input.organizationName !== undefined) {
		if (typeof input.organizationName !== "string")
			throwError(400, "VALIDATION_ERROR", "organizationName must be a string");
		const organizationName = input.organizationName.trim();
		if (organizationName.length === 0)
			throwError(400, "VALIDATION_ERROR", "organizationName cannot be empty");
		data.organizationName = organizationName;
	}
	if (input.bio !== undefined) {
		if (input.bio !== null && typeof input.bio !== "string")
			throwError(400, "VALIDATION_ERROR", "bio must be a string or null");
		data.bio = input.bio;
	}
	if (input.location !== undefined) {
		if (input.location !== null && typeof input.location !== "string")
			throwError(400, "VALIDATION_ERROR", "location must be a string or null");
		data.location = input.location;
	}
	if (input.availability !== undefined) {
		if (typeof input.availability !== "boolean")
			throwError(400, "VALIDATION_ERROR", "availability must be a boolean");
		data.availability = input.availability;
	}
	return await addHirerProfileData(userId, data);
}

export async function getCallerProfile(targetId: string) {
	const profile = await prisma.user.findUnique({ where: { id: targetId } });
	if (!profile) throwError(404, "USER_NOT_FOUND", "no user with that id");
	if (profile.role === UserRole.admin)
		throwError(404, "PROFILE_NOT_FOUND", "admin accounts don't have an artist/hirer profile");
	const result =
		profile.role === UserRole.artist
			? await prisma.artistProfile.findUnique({
					where: { userId: targetId },
					select: publicArtistSelect,
				})
			: await prisma.hirerProfile.findUnique({
					where: { userId: targetId },
					select: publicHirerSelect,
				});
	if (!result) throwError(404, "PROFILE_NOT_FOUND", `${profile.role} profile not found`);
	return result;
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
