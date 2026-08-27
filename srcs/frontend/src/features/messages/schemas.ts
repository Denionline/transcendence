import { z } from "zod";
import { LIMITS } from "../../lib/limits";
import { sanitizeParagraph } from "../../lib/sanitize";

//	Sanitized first, measured second — the same order the backend's message
//	schema uses. Trimming alone was not enough: a message of nothing but
//	zero-width spaces has length, passes .min(1), and is then refused by the
//	server, which strips the invisibles before it counts.
export const messageContentSchema = z
	.string()
	.transform(sanitizeParagraph)
	.pipe(
		z
			.string()
			.min(1, "Write something first")
			.max(LIMITS.longText, `Messages are limited to ${LIMITS.longText} characters`),
	);
