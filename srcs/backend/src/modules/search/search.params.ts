import { throwError } from "../../lib/http-error.js";
import { GigStatus } from "../../../generated/prisma/client.js";

export const MAX_TERM_LENGTH = 100;
export const MAX_CATEGORIES = 25;
export const DEFAULT_SORT = "newest";

export const GIG_SORTS = [
	"newest",
	"oldest",
	"rate_desc",
	"rate_asc",
	"popular",
	"relevance",
] as const;
export const ARTIST_SORTS = ["newest", "oldest", "relevance"] as const;
export const HIRER_SORTS = ARTIST_SORTS;

export type GigSort = (typeof GIG_SORTS)[number];
export type ArtistSort = (typeof ARTIST_SORTS)[number];
export type HirerSort = (typeof HIRER_SORTS)[number];

const LIKE_SPECIALS = /[\\%_]/g;

//	Prisma passes `contains` values through unescaped. A raw ?q=% matches everything.
function escapeLike(value: string): string {
	return value.replace(LIKE_SPECIALS, "\\$&");
}

function parseTerm(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", `${field} must be a single string`);
	}

	const term = value.trim();
	if (term.length === 0) return undefined;
	if (term.length > MAX_TERM_LENGTH) {
		throwError(400, "VALIDATION_ERROR", `${field} cannot exceed ${MAX_TERM_LENGTH} characters`);
	}
	return escapeLike(term);
}

export function parseQ(value: unknown): string | undefined {
	return parseTerm(value, "q");
}

export function parseLocation(value: unknown): string | undefined {
	return parseTerm(value, "location");
}

function splitCategories(value: unknown): string[] {
	if (typeof value === "string") return value.split(",");

	let isList = false;
	if (Array.isArray(value)) {
		isList = true;
	}
	if (isList === false) {
		throwError(400, "VALIDATION_ERROR", "category must be a string");
	}

	const entries: string[] = [];
	for (const entry of value as unknown[]) {
		if (typeof entry !== "string") {
			throwError(400, "VALIDATION_ERROR", "category must be a string");
		}
		entries.push(...entry.split(","));
	}
	return entries;
}

export function parseCategories(value: unknown): string[] | undefined {
	if (value === undefined) return undefined;

	const categories: string[] = [];
	for (const entry of splitCategories(value)) {
		const category = entry.trim();
		if (category.length === 0) continue;
		if (category.length > MAX_TERM_LENGTH) {
			throwError(
				400,
				"VALIDATION_ERROR",
				`each category cannot exceed ${MAX_TERM_LENGTH} characters`,
			);
		}
		if (categories.includes(category) === false) {
			categories.push(category);
		}
	}

	if (categories.length === 0) return undefined;
	if (categories.length > MAX_CATEGORIES) {
		throwError(400, "VALIDATION_ERROR", `no more than ${MAX_CATEGORIES} categories may be given`);
	}
	return categories;
}

function parseRate(value: unknown, field: string): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", `${field} must be a single integer`);
	}

	//	note: number("") is 0. An empty ?minRate= must bail out before the coercion.
	const raw = value.trim();
	if (raw.length === 0) return undefined;

	const rate = Number(raw);
	if (Number.isInteger(rate) === false) {
		throwError(400, "VALIDATION_ERROR", `${field} must be an integer`);
	}
	if (rate < 0) {
		throwError(400, "VALIDATION_ERROR", `${field} cannot be negative`);
	}
	return rate;
}

export function parseRateRange(
	minValue: unknown,
	maxValue: unknown,
): { minRate?: number; maxRate?: number } {
	const minRate = parseRate(minValue, "minRate");
	const maxRate = parseRate(maxValue, "maxRate");

	if (minRate !== undefined && maxRate !== undefined) {
		if (minRate > maxRate) {
			throwError(400, "VALIDATION_ERROR", "minRate cannot exceed maxRate");
		}
	}
	return { minRate, maxRate };
}

export function parseGigStatus(value: unknown): GigStatus | undefined {
	if (value === undefined) return GigStatus.open;
	if (value === "all") return undefined;
	if (value === GigStatus.open) return GigStatus.open;
	if (value === GigStatus.closed) return GigStatus.closed;
	throwError(400, "VALIDATION_ERROR", "status must be one of: open, closed, all");
}

export function parseAvailability(value: unknown): boolean | undefined {
	if (value === undefined) return undefined;
	if (value === "true") return true;
	if (value === "false") return false;
	throwError(400, "VALIDATION_ERROR", "availability must be true or false");
}

export function parseSort<T extends string>(
	value: unknown,
	allowed: readonly T[],
): T | typeof DEFAULT_SORT {
	if (value === undefined) return DEFAULT_SORT;

	let isAllowed = false;
	if (typeof value === "string") {
		if ((allowed as readonly string[]).includes(value)) {
			isAllowed = true;
		}
	}
	if (isAllowed === false) {
		throwError(400, "VALIDATION_ERROR", `sort must be one of: ${allowed.join(", ")}`);
	}
	return value as T;
}

//	ARTIST_SORTS already excludes popular; this only explains why.
export function parseArtistSort(value: unknown): ArtistSort {
	if (value === "popular") {
		throwError(400, "VALIDATION_ERROR", "sort=popular is available for gig search only");
	}
	return parseSort(value, ARTIST_SORTS);
}

//	HIRER_SORTS already excludes popular; this only explains why.
export function parseHirerSort(value: unknown): HirerSort {
	if (value === "popular") {
		throwError(400, "VALIDATION_ERROR", "sort=popular is available for gig search only");
	}
	return parseSort(value, HIRER_SORTS);
}
