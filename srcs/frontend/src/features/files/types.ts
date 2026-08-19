/** Mirrors the backend's FileType enum. `document` cannot be uploaded today. */
export type FileType = "image" | "audio" | "video" | "document";

/**
 * `public` means the file is *listed* on the owner's profile. It does not
 * gate retrieval: anyone holding a file's URL can fetch it, because the id in
 * that URL is the permission. See docs/mad/20260819-file-uploads.md.
 */
export type FileVisibility = "private" | "public";

export interface FileDto {
	id: string;
	type: FileType;
	mimeType: string;
	sizeBytes: number;
	originalName: string;
	visibility: FileVisibility;
	createdAt: string;
	/** Permanent and viewer-independent — safe to drop straight into an <img src>. */
	url: string;
}

export interface FileListResponse {
	items: FileDto[];
	page: number;
	pageSize: number;
	total: number;
}
