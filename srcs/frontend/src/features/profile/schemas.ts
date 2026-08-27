import { z } from "zod";
import { LIMITS } from "../../lib/limits";
import { sanitizeLine, sanitizeParagraph } from "../../lib/sanitize";

//	Mirrors MAX_PROFILE_CATEGORIES in the backend's categories service.
export const MAX_CATEGORIES = 10;

//	Stricter than the server's LIMITS.longText on purpose: a profile bio is a
//	blurb on a card, not an essay, and the counter under the textarea promises
//	this number. The server still accepts 2000, so this is a product choice the
//	client is free to make — parity only forbids going the other way.
export const MAX_BIO_LENGTH = 280;

//	The same rule as the backend's avatarUrl (srcs/backend/src/lib/schemas.ts):
//	a same-origin path for an uploaded file, or an absolute http(s) URL. Note
//	"//host/x.png" — it reads as a path but is an absolute URL to someone
//	else's host, so a startsWith("/") test would wave it through.
function isSafeAvatarUrl(value: string): boolean {
	//	"" is the form's way of saying "no avatar"; the call site turns it into
	//	the null the API expects (AccountSection.tsx).
	if (value === "") return true;
	if (value.startsWith("//")) return false;
	if (value.startsWith("/")) return true;

	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
}

//	Bounds mirror srcs/backend/src/lib/schemas.ts (LIMITS), and
//	srcs/frontend/src/test/parity.test.ts fails if they drift apart.

const usernameField = z
	.string()
	.transform(sanitizeLine)
	.pipe(
		z
			.string()
			.min(1, "Username is required")
			.max(LIMITS.username, `Keep the username under ${LIMITS.username} characters`),
	);

const emailField = z
	.string()
	.trim()
	.min(1, "Email is required")
	.max(LIMITS.email, "That email address is too long")
	.pipe(z.email("Enter a valid email"));

//	Settings → Account: the fields that describe the login rather than the
//	profile. AccountSection.tsx is the only form that writes them.
export const accountSchema = z.object({
	username: usernameField,
	email: emailField,
	avatarUrl: z
		.string()
		.trim()
		.max(LIMITS.url, "That URL is too long")
		.refine(isSafeAvatarUrl, "Use an image URL starting with http:// or https://"),
});

const organizationNameField = z
	.string()
	.transform(sanitizeLine)
	.pipe(
		z
			.string()
			.min(1, "Organization name is required")
			.max(LIMITS.shortText, `Keep the organization name under ${LIMITS.shortText} characters`),
	);

//	A slug the user picks from a list rather than types, but it still travels
//	as a string the server measures — the backend parses each entry with
//	requiredText("category", 60), so the ceiling belongs here too.
const CATEGORY_SLUG_MAX = 60;

//	sanitizeLine rather than trim, in that order: the server sanitizes before
//	it measures, so a slug of one zero-width space is empty to it and length 1
//	to a trim — the parity suite fails on exactly that value.
const categorySlug = z
	.string()
	.transform(sanitizeLine)
	.pipe(
		z
			.string()
			.min(1, "Pick a category")
			.max(CATEGORY_SLUG_MAX, `Keep the category under ${CATEGORY_SLUG_MAX} characters`),
	);

const bioField = z
	.string()
	.transform(sanitizeParagraph)
	.pipe(z.string().max(MAX_BIO_LENGTH, `Keep the bio under ${MAX_BIO_LENGTH} characters`));

const locationField = z
	.string()
	.transform(sanitizeLine)
	.pipe(z.string().max(LIMITS.shortText, `Keep the location under ${LIMITS.shortText} characters`));

//	The artist's own profile (ArtistProfileView.tsx). No rate: the field the
//	old settings form collected has no column behind it and the current UI
//	does not ask for one.
export const artistDetailsSchema = z.object({
	categories: z
		.array(categorySlug)
		.min(1, "Pick at least one category")
		.max(MAX_CATEGORIES, `Pick at most ${MAX_CATEGORIES} categories`),
	bio: bioField,
	location: locationField,
	availability: z.boolean(),
});

//	The hirer's own profile (HirerProfileView.tsx). No categories: matching
//	runs on each gig's category, not on the hirer's profile.
export const hirerDetailsSchema = z.object({
	organizationName: organizationNameField,
	bio: bioField,
	location: locationField,
});

export type AccountValues = z.infer<typeof accountSchema>;
export type ArtistDetailsValues = z.infer<typeof artistDetailsSchema>;
export type HirerDetailsValues = z.infer<typeof hirerDetailsSchema>;

//	Onboarding collects one category rather than a list, and everything past
//	the required field is optional — but still bounded, since these are the
//	same columns the profile views write to.
export const artistOnboardingSchema = z.object({
	category: categorySlug,
	bio: bioField,
	location: locationField,
	availability: z.boolean(),
});

export const hirerOnboardingSchema = z.object({
	organizationName: organizationNameField,
	bio: bioField,
	location: locationField,
});

export type ArtistOnboardingValues = z.infer<typeof artistOnboardingSchema>;
export type HirerOnboardingValues = z.infer<typeof hirerOnboardingSchema>;
