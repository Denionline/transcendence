import { flattenError, type ZodType, type output } from "zod";
import { ApiError } from "./apiClient";

//	The plumbing every form was repeating: run a schema, and if it fails, pull
//	the first message for each field into a shape the inputs can index.
//
//	Client-side validation here is for the person typing — instant, specific,
//	no round trip. It is not a security boundary: the same rules are enforced
//	again in srcs/backend/src/lib/schemas.ts, and that copy is the authority.

export type FieldErrors<Values> = Partial<Record<keyof Values & string, string>>;

type Result<Schema extends ZodType> =
	{ ok: true; data: output<Schema> } | { ok: false; errors: FieldErrors<output<Schema>> };

export function validateForm<Schema extends ZodType>(
	schema: Schema,
	values: unknown,
): Result<Schema> {
	const result = schema.safeParse(values);
	if (result.success) return { ok: true, data: result.data };

	const flattened = flattenError(result.error).fieldErrors as Record<string, string[] | undefined>;
	const errors: Record<string, string> = {};
	for (const [field, messages] of Object.entries(flattened)) {
		//	Only the first: a field with three problems still has one input to
		//	show them under, and the first is the one the user hits next.
		if (messages && messages[0]) errors[field] = messages[0];
	}
	return { ok: false, errors: errors as FieldErrors<output<Schema>> };
}

/**
 * The same shape, but from the server's answer. A 400 VALIDATION_ERROR
 * carries `details: [{ path, message }]` (see the backend's error middleware),
 * so a rule only the server knows — an email already taken, a category that
 * was deleted since the page loaded — can still land under the right input
 * instead of in a banner at the top of the form.
 *
 * Returns null when the error is not a per-field one, which is the caller's
 * cue to show it as a form-level message.
 */
export function fieldErrorsFromApi<Values>(error: unknown): FieldErrors<Values> | null {
	if (!(error instanceof ApiError) || !error.details || error.details.length === 0) return null;

	const errors: Record<string, string> = {};
	for (const detail of error.details) {
		//	A detail about the payload as a whole has an empty path and no input
		//	to attach to; the caller's banner handles it.
		if (detail.path && !errors[detail.path]) errors[detail.path] = detail.message;
	}
	return Object.keys(errors).length > 0 ? (errors as FieldErrors<Values>) : null;
}
