import { z } from "zod";
import { LIMITS, nullableParagraph, nullableText, requiredText } from "../../lib/schemas.js";

const categories = z.array(requiredText("category", 60), "categories must be an array of strings");

export const updateProfileBody = z.object({
	categories: categories.optional(),
	bio: nullableParagraph("bio", LIMITS.longText).optional(),
	location: nullableText("location").optional(),
	organizationName: requiredText("organizationName").optional(),
	availability: z.boolean("availability must be a boolean").optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileBody>;
