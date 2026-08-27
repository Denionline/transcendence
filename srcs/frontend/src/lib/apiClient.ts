import { getAccessToken, hasSessionMarker, refreshAccessToken } from "../features/auth/api";
import { notifySessionExpired } from "../features/auth/sessionEvents";

//	One problem with one field, as the backend's error middleware sends them.
export interface ApiErrorDetail {
	path: string;
	message: string;
}

export class ApiError extends Error {
	status: number;
	code?: string;
	//	Present only on a 400 VALIDATION_ERROR. lib/formValidation.ts turns it
	//	into per-field messages; everything else can ignore it.
	details?: ApiErrorDetail[];

	constructor(status: number, message: string, code?: string, details?: ApiErrorDetail[]) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

// Concurrent 401s (e.g. a poll interval and a user action landing at once)
// should trigger exactly one refresh, not one per caller — everyone waiting
// shares this same in-flight promise instead of racing /auth/refresh.
let refreshPromise: Promise<string> | null = null;

// Exported for features/files/api.ts, which needs XHR for progress events and
// so cannot go through apiRequest.
export function refreshOnce(): Promise<string> {
	if (!refreshPromise) {
		refreshPromise = refreshAccessToken().finally(() => {
			refreshPromise = null;
		});
	}
	return refreshPromise;
}

function rawFetch(path: string, options: RequestInit, token: string | null): Promise<Response> {
	return fetch(`/api${path}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers,
		},
	});
}

/**
 * `retry` is an internal recursion guard, not a caller-facing option: a 15
 * minute access token silently expiring mid-session is the *normal* case for
 * anyone who leaves a tab open, not an error, so the first 401 is answered
 * with one silent refresh-and-retry (see refreshAccessToken) before it's ever
 * surfaced to the caller. Only a second 401 — or the refresh itself failing,
 * meaning the refresh cookie is gone too — becomes a real, visible failure,
 * and in the refresh-failed case that's routed through notifySessionExpired
 * instead of a thrown error, since the whole app needs to know, not just
 * whoever happened to make this particular request.
 */
export async function apiRequest<T>(
	path: string,
	options: RequestInit = {},
	retry = true,
): Promise<T> {
	const res = await rawFetch(path, options, getAccessToken());

	if (res.status === 401 && retry && hasSessionMarker()) {
		try {
			await refreshOnce();
		} catch {
			notifySessionExpired();
			throw new ApiError(401, "Your session has expired. Please log in again.", "SESSION_EXPIRED");
		}
		return apiRequest<T>(path, options, false);
	}

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new ApiError(
			res.status,
			body.message ?? `Request failed (${res.status})`,
			body.error,
			body.details,
		);
	}
	return res.status === 204 ? (null as T) : res.json();
}
