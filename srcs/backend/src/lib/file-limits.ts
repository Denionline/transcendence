import { FileType } from "../../generated/prisma/enums.js";

const MB = 1024 * 1024;

interface FileRule {
	maxBytes: number;
	extensions: Record<string, string>;
}

//	`image/svg+xml` is absent on purpose: SVG is executable XML, so it is
//	dangerous even when it really is what it claims to be. `document` has no
//	entry either, so nothing can be uploaded as one.
export const FILE_RULES: Record<string, FileRule> = {
	[FileType.image]: {
		maxBytes: 5 * MB,
		extensions: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
	},
	[FileType.audio]: {
		maxBytes: 15 * MB,
		extensions: { "audio/mpeg": "mp3", "audio/mp4": "m4a" },
	},
	[FileType.video]: {
		maxBytes: 50 * MB,
		extensions: { "video/mp4": "mp4" },
	},
};

export function typeForMime(mimeType: string): FileType | null {
	for (const [type, rule] of Object.entries(FILE_RULES)) {
		if (mimeType in rule.extensions) return type as FileType;
	}
	return null;
}

export function extFor(mimeType: string): string | null {
	for (const rule of Object.values(FILE_RULES)) {
		const extension = rule.extensions[mimeType];
		if (extension !== undefined) return extension;
	}
	return null;
}

export function maxBytesFor(type: FileType): number {
	const rule = FILE_RULES[type];
	if (!rule) return 0;
	return rule.maxBytes;
}

export const ACCEPTED_MIME_TYPES = Object.values(FILE_RULES).flatMap((rule) =>
	Object.keys(rule.extensions),
);
