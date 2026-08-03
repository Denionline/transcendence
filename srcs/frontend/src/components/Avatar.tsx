import { useState } from "react";
import { initials } from "../lib/format";

const SIZE_CLASSES = {
	sm: "w-9",
	md: "w-10",
	lg: "w-20",
} as const;

interface AvatarProps {
	username: string;
	avatarUrl?: string | null;
	size?: keyof typeof SIZE_CLASSES;
	className?: string;
}

export default function Avatar({ username, avatarUrl, size = "md", className = "" }: AvatarProps) {
	const [imageFailed, setImageFailed] = useState(false);
	// Retry the image if the caller hands us a new URL (e.g. after saving a
	// fresh avatarUrl) instead of getting stuck on a previous failure.
	const [lastAvatarUrl, setLastAvatarUrl] = useState(avatarUrl);
	if (avatarUrl !== lastAvatarUrl) {
		setLastAvatarUrl(avatarUrl);
		setImageFailed(false);
	}

	const sizeClass = SIZE_CLASSES[size];

	if (avatarUrl && !imageFailed) {
		return (
			<div className={`avatar ${className}`}>
				<div className={`${sizeClass} rounded-full`}>
					<img src={avatarUrl} alt={username} onError={() => setImageFailed(true)} />
				</div>
			</div>
		);
	}

	return (
		<div className={`avatar avatar-placeholder ${className}`}>
			<div className={`${sizeClass} rounded-full bg-neutral text-neutral-content`}>
				<span className="text-xs">{initials(username)}</span>
			</div>
		</div>
	);
}
