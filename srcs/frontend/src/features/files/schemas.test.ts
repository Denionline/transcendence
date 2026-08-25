import { describe, expect, test } from "vitest";

import { validationErrorFor } from "./schemas";
import { FILE_RULES } from "./constants";

//	Fast feedback, not a security boundary: the server re-derives the type from
//	the file's own magic bytes (srcs/backend/src/lib/file-signature.ts) and
//	refuses anything whose content disagrees with its declared MIME. What is
//	checked here is only that the browser stops the obvious cases first.

/** A File of a given declared type and size, without allocating the bytes. */
function fileOf(mimeType: string, size: number, name = "upload.bin"): File {
	const file = new File(["x"], name, { type: mimeType });
	//	File.size is read-only and derives from the parts, so it is redefined
	//	rather than built from a 50 MB buffer the test does not need.
	Object.defineProperty(file, "size", { value: size });
	return file;
}

describe("validationErrorFor", () => {
	test("accepts every type the API accepts, at its own ceiling", () => {
		for (const [type, rule] of Object.entries(FILE_RULES)) {
			for (const mimeType of rule.mimeTypes) {
				expect(
					validationErrorFor(fileOf(mimeType, rule.maxBytes)),
					`${type}/${mimeType}`,
				).toBeNull();
			}
		}
	});

	test("refuses a type the API does not accept", () => {
		for (const mimeType of ["application/pdf", "image/gif", "text/html", "application/zip", ""]) {
			expect(validationErrorFor(fileOf(mimeType, 1024)), mimeType).toMatch(/isn't supported/);
		}
	});

	//	Each type has its own ceiling, so an image is refused at a size a video
	//	would be fine at. The message names both the size and the limit.
	test("refuses a file one byte past its own type's ceiling", () => {
		for (const rule of Object.values(FILE_RULES)) {
			const mimeType = rule.mimeTypes[0];
			expect(validationErrorFor(fileOf(mimeType, rule.maxBytes + 1)), mimeType).toMatch(
				/The limit for/,
			);
		}
	});

	test("the ceilings are per type, not shared", () => {
		//	20 MB: past the image limit, inside the video one.
		const size = 20 * 1024 * 1024;
		expect(validationErrorFor(fileOf("image/png", size))).not.toBeNull();
		expect(validationErrorFor(fileOf("video/mp4", size))).toBeNull();
	});

	test("refuses something that is not a file at all", () => {
		expect(validationErrorFor("not a file" as unknown as File)).toBe("Choose a file");
		expect(validationErrorFor(null as unknown as File)).toBe("Choose a file");
	});

	//	An empty file has a valid type and no content; the server will reject it
	//	when the signature check finds nothing to match.
	test("an empty file of an accepted type passes the browser check", () => {
		expect(validationErrorFor(fileOf("image/png", 0))).toBeNull();
	});
});
