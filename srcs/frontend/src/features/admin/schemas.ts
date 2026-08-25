import { z } from "zod";
import { LIMITS } from "../../lib/limits";
import { sanitizeLine } from "../../lib/sanitize";

//	Bounds mirror srcs/backend/src/lib/schemas.ts (LIMITS), and
//	srcs/frontend/src/test/parity.test.ts fails if they drift apart. The server is
//	the authority; these exist so a typo is answered in the dialog rather than
//	by a round trip that comes back 400.
export const editUserSchema = z.object({
	username: z
		.string()
		.transform(sanitizeLine)
		.pipe(
			z
				.string()
				.min(1, "Username is required")
				.max(LIMITS.username, `Keep the username under ${LIMITS.username} characters`),
		),
	email: z
		.string()
		.trim()
		.min(1, "Email is required")
		.max(LIMITS.email, "That email address is too long")
		.pipe(z.email("Enter a valid email")),
	role: z.enum(["artist", "hirer", "admin"], "Pick a role"),
});

export type EditUserValues = z.infer<typeof editUserSchema>;
