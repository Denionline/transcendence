import { z } from "zod";
import { id } from "../../lib/schemas.js";

export const friendIdParams = z.object({ id });

export const updateFriendshipBody = z.object({
	accepted: z.boolean("accepted must be a boolean"),
});

export type UpdateFriendshipBody = z.infer<typeof updateFriendshipBody>;
