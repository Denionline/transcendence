import type { FileDto } from "../types";

interface FilePreviewProps {
	file: FileDto;
	className?: string;
}

/**
 * `preload="metadata"` is not optional: without it every <video> on a profile
 * page starts buffering the moment it mounts, and a gallery of six reels will
 * pull the lot before the user has clicked anything.
 */
export default function FilePreview({ file, className = "" }: FilePreviewProps) {
	switch (file.type) {
		case "image":
			return (
				<img
					src={file.url}
					alt={file.originalName}
					loading="lazy"
					className={`h-full w-full object-cover ${className}`}
				/>
			);
		case "audio":
			return <audio controls preload="metadata" src={file.url} className={`w-full ${className}`} />;
		case "video":
			return (
				<video
					controls
					preload="metadata"
					src={file.url}
					className={`h-full w-full object-cover ${className}`}
				/>
			);
		default:
			//	Unreachable today — `document` has no entry in FILE_RULES, so
			//	nothing can be uploaded as one. It stays as the fallback for a
			//	row written before a type was removed from the allow-list.
			return (
				<a href={file.url} download className={`link text-sm ${className}`}>
					{file.originalName}
				</a>
			);
	}
}
