// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
const UNICODE_BREAKS = /[\u2028\u2029]/g;
const HORIZONTAL_RUNS = /[^\S\n]+/g;
const LINE_BREAKS = /[\r\n]+/g;
const CARRIAGE_RETURNS = /\r\n?/g;
const BLANK_RUNS = /\n{3,}/g;

function normalize(value: string): string {
	return value
		.normalize("NFC")
		.replace(CONTROL, "")
		.replace(INVISIBLE, "")
		.replace(UNICODE_BREAKS, "\n");
}

export function sanitizeLine(value: string): string {
	return normalize(value).replace(LINE_BREAKS, " ").replace(HORIZONTAL_RUNS, " ").trim();
}

export function sanitizeParagraph(value: string): string {
	return normalize(value).replace(CARRIAGE_RETURNS, "\n").replace(BLANK_RUNS, "\n\n").trim();
}
