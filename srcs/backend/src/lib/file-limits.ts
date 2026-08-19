import { FileType } from "../../generated/prisma/enums.js";

const MB = 1024 * 1024;

interface FileRule {
	maxBytes: number;
	//	MIME → extension. One table, so `typeForMime` and `extFor` can never
	//	drift apart the way two parallel lists would.
	extensions: Record<string, string>;
}

//	The single source of truth for what may be uploaded.
//
//	`image/svg+xml` is absent on purpose: SVG is executable XML, so it is the
//	one format that is dangerous *even when it really is what it claims to be*
//	— and phase 2.2's "we validate the declaration, not the content" argument
//	does not cover it. GIF, OGG, WAV and WebM are absent for no deeper reason
//	than nobody needing them yet; each is one line.
//
//	`document` is a valid FileType in schema.prisma but has no entry here, so
//	nothing can be uploaded as one. Adding PDF later is one table row.
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
	//	Unreachable for any type `typeForMime` returned, which is the only way
	//	a FileType reaches this function.
	if (!rule) return 0;
	return rule.maxBytes;
}

//	What the frontend's <input accept="..."> and the API docs both read from.
export const ACCEPTED_MIME_TYPES = Object.values(FILE_RULES).flatMap((rule) =>
	Object.keys(rule.extensions),
);
