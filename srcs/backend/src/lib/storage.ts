import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./env.js";
import { extFor } from "./file-limits.js";
import { throwError } from "./http-error.js";

//	Every `fs` call for uploaded bytes lives in this file, and nothing else in
//	the codebase may touch the upload directory. That is what keeps the A1 → A3
//	move (serve through Nginx instead of Express) a one-file change.
//	See docs/mad/20260819-file-uploads.md.

//	UPLOAD_DIR can arrive relative (tests, CI), so resolve it once here and
//	compare against the resolved form — a relative prefix check would pass for
//	paths that escape the directory.
const ROOT = path.resolve(UPLOAD_DIR);

export async function ensureUploadDir(): Promise<void> {
	await mkdir(ROOT, { recursive: true });
}

//	The path-traversal guard. `location` comes out of the database, but a row
//	is only ever as trustworthy as whatever wrote it, so the check is here
//	rather than at the write site.
export function resolveKey(location: string): string {
	const resolved = path.resolve(ROOT, location);
	//	Strictly *inside* the root. The `+ path.sep` is what makes this a
	//	directory-containment test rather than a string-prefix one — without
	//	it, a sibling directory named `/app/uploads-evil` would pass.
	//
	//	Note there is no `resolved === ROOT` allowance: an empty, "." or "/"
	//	location resolves to the directory itself, and the directory is not a
	//	file we can serve or unlink. Rejecting it here turns what would be an
	//	EISDIR 500 from deep inside fs into a clean 400 at the boundary.
	//	Unreachable today — every location is `<uuid>.<ext>` — but this
	//	function exists precisely to not trust that.
	if (!resolved.startsWith(ROOT + path.sep))
		throwError(400, "INVALID_PATH", "invalid file location");
	return resolved;
}

//	ENOENT is not an error here: phase D1 deletes the row first, so a missing
//	file means the previous delete got halfway and this one is finishing it.
export async function deleteFile(location: string): Promise<void> {
	try {
		await unlink(resolveKey(location));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
}

//	The stored filename is a fresh UUID plus the extension the allow-list
//	mapped the MIME to. The client-supplied filename is *never* a path
//	component — `originalName` is display metadata and nothing more. This is
//	the other half of the traversal guard, at the write side.
export function buildLocation(mimeType: string): string {
	const extension = extFor(mimeType);
	if (extension === null) throwError(415, "UNSUPPORTED_FILE_TYPE", `cannot store ${mimeType}`);
	return `${randomUUID()}.${extension}`;
}
