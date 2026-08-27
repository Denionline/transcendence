import { z } from "zod";
import { LIMITS, email, password, requiredText } from "../../lib/schemas.js";

export const registerBody = z.object({
	name: requiredText("name", LIMITS.username),
	email,
	password,
	role: z.enum(["artist", "hirer"], "role must be either 'artist' or 'hirer'"),
});

export const loginBody = z.object({ email, password });

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
