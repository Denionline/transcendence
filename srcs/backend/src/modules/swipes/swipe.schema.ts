import { z } from "zod";
import { id, optionalText } from "../../lib/schemas.js";

const MAX_ID_LIST = 2000;
const idList = optionalText("list", MAX_ID_LIST).optional();

export const createSwipeBody = z.object({
	gigId: id,
	liked: z.boolean("liked must be a boolean"),
	targetUserId: id.optional(),
});

export const nextQuery = z.object({
	gigId: id.optional(),
	excludeIds: idList,
	categories: idList,
});

export const swipeHistoryQuery = z.object({
	liked: z.enum(["true", "false"], "liked must be true or false").optional(),
	gigId: id.optional(),
});

export type CreateSwipeBody = z.infer<typeof createSwipeBody>;
