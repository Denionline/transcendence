import type { FileType } from "./types";

const MB = 1024 * 1024;

// Mirrors FILE_RULES in srcs/backend/src/lib/file-limits.ts. This copy fails
// fast in the browser and is not security: the server re-checks everything.
export const FILE_RULES: Record<
	Exclude<FileType, "document">,
	{ maxBytes: number; mimeTypes: string[] }
> = {
	image: { maxBytes: 5 * MB, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
	audio: { maxBytes: 15 * MB, mimeTypes: ["audio/mpeg", "audio/mp4"] },
	video: { maxBytes: 50 * MB, mimeTypes: ["video/mp4"] },
};

export const ACCEPTED_MIME_TYPES = Object.values(FILE_RULES).flatMap((rule) => rule.mimeTypes);

export function typeForMime(mimeType: string): Exclude<FileType, "document"> | null {
	for (const [type, rule] of Object.entries(FILE_RULES)) {
		if (rule.mimeTypes.includes(mimeType)) return type as Exclude<FileType, "document">;
	}
	return null;
}

export function maxBytesFor(mimeType: string): number | null {
	const type = typeForMime(mimeType);
	return type === null ? null : FILE_RULES[type].maxBytes;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}
