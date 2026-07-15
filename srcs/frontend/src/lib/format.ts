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
