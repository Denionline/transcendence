import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./env.js";
import { extFor } from "./file-limits.js";
import { throwError } from "./http-error.js";

//	Every `fs` call for uploaded bytes lives in this file, so moving to Nginx
//	stays a one-file change. See docs/mad/20260819-file-uploads.md.

//	UPLOAD_DIR can arrive relative (tests, CI), so resolve it once and compare
//	against the resolved form.
const ROOT = path.resolve(UPLOAD_DIR);

export async function ensureUploadDir(): Promise<void> {
	await mkdir(ROOT, { recursive: true });
}

//	The path-traversal guard. `location` comes out of the database, which is
//	only ever as trustworthy as whatever wrote it.
export function resolveKey(location: string): string {
	const resolved = path.resolve(ROOT, location);
	//	The `+ path.sep` makes this a directory-containment test rather than a
	//	string-prefix one: without it, a sibling `/app/uploads-evil` would pass.
	//	It also rejects the root itself, which is a directory, not a file.
	if (!resolved.startsWith(ROOT + path.sep))
		throwError(400, "INVALID_PATH", "invalid file location");
	return resolved;
}

//	ENOENT is not an error: the row is deleted before the bytes, so a missing
//	file means a previous delete got halfway.
export async function deleteFile(location: string): Promise<void> {
	try {
		await unlink(resolveKey(location));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
}

//	A fresh UUID plus the extension the allow-list mapped the MIME to. The
//	client's filename is never a path component — it is display metadata.
export function buildLocation(mimeType: string): string {
	const extension = extFor(mimeType);
	if (extension === null) throwError(415, "UNSUPPORTED_FILE_TYPE", `cannot store ${mimeType}`);
	return `${randomUUID()}.${extension}`;
}
