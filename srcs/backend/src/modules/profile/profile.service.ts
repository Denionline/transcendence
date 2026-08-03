import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { Prisma } from "../../../generated/prisma/client.js";

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
}
