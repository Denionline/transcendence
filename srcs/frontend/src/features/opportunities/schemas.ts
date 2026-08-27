import { z } from "zod";
import { LIMITS } from "../../lib/limits";
import { sanitizeLine, sanitizeParagraph } from "../../lib/sanitize";

// Only fields the backend's Gig model actually persists — title and category
// are required, the rest are optional. The category is validated as a
// non-empty slug here and checked against the real vocabulary server-side,
// which returns CATEGORY_NOT_FOUND for anything unknown; the form can no
// longer hold its own copy of the allowed values.
//
// Bounds mirror srcs/backend/src/lib/schemas.ts (LIMITS), and
// srcs/frontend/src/test/parity.test.ts fails if they drift apart.
export const opportunitySchema = z.object({
	title: z
		.string()
		.transform(sanitizeLine)
		.pipe(
			z
				.string()
				.min(1, "Title is required")
				.max(LIMITS.shortText, `Keep the title under ${LIMITS.shortText} characters`),
		),
	category: z.string().min(1, "Select a category"),
	description: z
		.string()
		.transform(sanitizeParagraph)
		.pipe(
			z.string().max(LIMITS.longText, `Keep the description under ${LIMITS.longText} characters`),
		),
	location: z
		.string()
		.transform(sanitizeLine)
		.pipe(
			z.string().max(LIMITS.shortText, `Keep the location under ${LIMITS.shortText} characters`),
		),
	//	A text input, so "" means "not given" rather than zero. The ceiling is
	//	the server's: without it the form accepts 9999999999 and the save fails.
	rate: z
		.string()
		.refine((value) => value === "" || /^\d+$/.test(value), {
			message: "Rate must be a whole number of 0 or more",
		})
		.refine((value) => value === "" || Number(value) <= LIMITS.rate, {
			message: `Rate must be at most ${LIMITS.rate}`,
		}),
});

export type OpportunityFormValues = z.input<typeof opportunitySchema>;
export type OpportunityFormOutput = z.output<typeof opportunitySchema>;
