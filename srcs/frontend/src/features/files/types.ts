//	Mirrors the backend's FileType enum. `document` cannot be uploaded today.
export type FileType = "image" | "audio" | "video" | "document";

//	`public` means the file is listed on the owner's profile. It does not gate
//	retrieval: the id in a file's URL is the permission.
export type FileVisibility = "private" | "public";

export interface FileDto {
	id: string;
	type: FileType;
	mimeType: string;
	sizeBytes: number;
	originalName: string;
	visibility: FileVisibility;
	createdAt: string;
	url: string;
}

export interface FileListResponse {
	items: FileDto[];
	page: number;
	pageSize: number;
	total: number;
}
