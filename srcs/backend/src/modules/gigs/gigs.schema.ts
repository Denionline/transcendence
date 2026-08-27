import { z } from "zod";
import { GigStatus } from "../../../generated/prisma/enums.js";
import {
	LIMITS,
	enumOf,
	id,
	optionalText,
	paragraph,
	rate,
	requiredText,
} from "../../lib/schemas.js";

const category = requiredText("category", 60);

export const gigIdParams = z.object({ id });

export const createGigBody = z.object({
	title: requiredText("title"),
	category,
	description: paragraph("description", LIMITS.longText).optional(),
	location: optionalText("location").optional(),
	rate: rate.optional(),
	status: enumOf(GigStatus, "status").optional(),
});

export const updateGigBody = createGigBody.partial();

export const listGigsQuery = z.object({
	status: enumOf(GigStatus, "status").optional(),
	category: category.optional(),
	mine: z.string().optional(),
});

export type CreateGigBody = z.infer<typeof createGigBody>;
export type UpdateGigBody = z.infer<typeof updateGigBody>;
