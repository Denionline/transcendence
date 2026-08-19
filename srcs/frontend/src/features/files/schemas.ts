import { z } from "zod";
import { FILE_RULES, formatBytes, typeForMime } from "./constants";

// Fast feedback, not a security boundary — see constants.ts. The point is
// that a user who picks a 200 MB file learns so immediately, instead of
// watching a progress bar crawl to a 413.
export const uploadCandidateSchema = z
	.custom<File>((value) => value instanceof File, "Choose a file")
	.superRefine((file, ctx) => {
		const type = typeForMime(file.type);
		if (type === null) {
			ctx.addIssue({
				code: "custom",
				message: "That file type isn't supported. Use a JPEG, PNG, WebP, MP3, M4A or MP4.",
			});
			return;
		}

		const { maxBytes } = FILE_RULES[type];
		if (file.size > maxBytes) {
			ctx.addIssue({
				code: "custom",
				message: `That file is ${formatBytes(file.size)}. The limit for ${type} is ${formatBytes(maxBytes)}.`,
			});
		}
	});

/** Returns the problem with a chosen file, or null if it looks uploadable. */
export function validationErrorFor(file: File): string | null {
	const result = uploadCandidateSchema.safeParse(file);
	return result.success ? null : (result.error.issues[0]?.message ?? "That file can't be uploaded");
}
