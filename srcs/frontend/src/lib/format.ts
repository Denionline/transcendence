export function initials(username: string): string {
	return username.slice(0, 2).toUpperCase();
}

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatRelativeTime(iso: string): string {
	const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return formatDate(iso);
}
