//	A mirror of srcs/backend/src/lib/sanitize.ts. The server sanitizes every
//	text field before it measures it, which means a value made entirely of
//	invisible characters is empty as far as the API is concerned. Without the
//	same treatment here, a form happily accepts a username of zero-width spaces
//	and the server answers 400 -- the exact round trip these schemas exist to
//	avoid.
//
//	Kept deliberately identical to the backend copy, which stays the authority;
//	this one is for the person typing.

//	C0 minus tab/newline/carriage return, plus DEL and C1.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

//	Zero-width space, non-joiner and joiner; the bidi marks, embeddings,
//	overrides and isolates; word joiner; invisible operators; and the BOM.
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

//	LINE SEPARATOR and PARAGRAPH SEPARATOR: real breaks, but ones no textarea
//	produces. Folded into ordinary newlines rather than dropped.
const UNICODE_BREAKS = /[\u2028\u2029]/g;

//	Whitespace that is not a line break.
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

/** For fields that are one line: a username, a title, a location. */
export function sanitizeLine(value: string): string {
	return normalize(value).replace(LINE_BREAKS, " ").replace(HORIZONTAL_RUNS, " ").trim();
}

/** For prose: a bio, a gig description, a chat message. */
export function sanitizeParagraph(value: string): string {
	return normalize(value).replace(CARRIAGE_RETURNS, "\n").replace(BLANK_RUNS, "\n\n").trim();
}
