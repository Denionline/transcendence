import i18n from "../i18n";

export function initials(username: string): string {
	return username.slice(0, 2).toUpperCase();
}

// Dates and times follow the active UI language rather than the browser's own
// locale — otherwise a Portuguese UI would print "Aug 21, 2026" for someone
// whose browser is set to English.
export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(i18n.resolvedLanguage, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(i18n.resolvedLanguage, {
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * These are plain functions, not hooks, so they read the i18n instance
 * directly instead of receiving `t`. That works because every component that
 * displays a formatted time also calls useTranslation() for its surrounding
 * copy, so it re-renders — and recomputes this — when the language changes.
 */
export function formatRelativeTime(iso: string): string {
	const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
	if (minutes < 1) return i18n.t("time.justNow");
	if (minutes < 60) return i18n.t("time.minutesAgo", { count: minutes });
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return i18n.t("time.hoursAgo", { count: hours });
	const days = Math.floor(hours / 24);
	if (days < 7) return i18n.t("time.daysAgo", { count: days });
	return formatDate(iso);
}
