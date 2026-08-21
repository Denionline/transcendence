import type { ProfileMediaItem } from "../artists/types";
import type { FileDto } from "./types";

/**
 * Maps a real uploaded file to the shape ProfileMediaGallery expects, so an
 * artist's own portfolio can play through the same swipeable viewer a hirer
 * sees. Returns null for "document" — unreachable via the upload flow today
 * (FILE_RULES has no entry for it, see constants.ts) but still part of the
 * FileType union, so the gallery has nothing to render it as.
 */
export function fileToMediaItem(file: FileDto): ProfileMediaItem | null {
	if (file.type === "document") return null;
	return { id: file.id, type: file.type, url: file.url, label: file.originalName };
}
