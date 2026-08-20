import { apiRequest, ApiError, refreshOnce } from "../../lib/apiClient";
import { getAccessToken, hasSessionMarker } from "../auth/api";
import { notifySessionExpired } from "../auth/sessionEvents";
import type { FileDto, FileListResponse, FileVisibility } from "./types";

interface UploadOptions {
	visibility?: FileVisibility;
	onProgress?: (percent: number) => void;
	signal?: AbortSignal;
}

//	Narrow on purpose: the two fields every caller dereferences, not a
//	full-schema validation. It closes the one hole XHR opens that fetch
//	does not.
function isFileDto(body: unknown): body is FileDto {
	if (typeof body !== "object" || body === null) return false;
	const candidate = body as Partial<FileDto>;
	return typeof candidate.id === "string" && typeof candidate.url === "string";
}

/**
 * One attempt, no refresh handling — see `uploadFile` for that.
 *
 * Not routed through `apiRequest`: that hardcodes `Content-Type:
 * application/json`, which a multipart body must not carry — the browser
 * sets it itself, because the boundary is part of the header. And `fetch()`
 * cannot report upload progress at all.
 */
function sendUpload(file: File, options: UploadOptions): Promise<FileDto> {
	return new Promise((resolve, reject) => {
		//	The standard AbortSignal contract, and load-bearing on the second
		//	attempt: a signal aborted during the refresh has already fired its
		//	event, so the listener below would never run.
		if (options.signal?.aborted) return reject(new ApiError(0, "Upload cancelled"));

		//	Rebuilt per attempt rather than hoisted: `file` is a handle the
		//	browser re-reads from disk, so a retry re-sends the real bytes.
		const form = new FormData();
		form.append("file", file);
		if (options.visibility) form.append("visibility", options.visibility);

		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/files");
		xhr.withCredentials = true;

		//	Read here, not in uploadFile: on the retry this has to pick up the
		//	token the refresh just minted.
		const token = getAccessToken();
		if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
		//	No Content-Type header here, on purpose: the browser sets it.

		const abort = () => xhr.abort();
		options.signal?.addEventListener("abort", abort, { once: true });
		//	Fires after load, error, abort and timeout alike, so the listener
		//	never outlives the attempt that registered it.
		xhr.onloadend = () => options.signal?.removeEventListener("abort", abort);

		xhr.upload.onprogress = (event) => {
			if (!event.lengthComputable) return;
			options.onProgress?.(Math.round((event.loaded / event.total) * 100));
		};

		xhr.onload = () => {
			let body: unknown = null;
			try {
				body = JSON.parse(xhr.responseText);
			} catch {
				//	A non-JSON body means something upstream failed; the status
				//	code below is still the useful part.
			}

			if (xhr.status < 200 || xhr.status >= 300) {
				const failure = (body ?? {}) as { message?: string; error?: string };
				return reject(
					new ApiError(
						xhr.status,
						failure.message ?? `Upload failed (${xhr.status})`,
						failure.error,
					),
				);
			}

			//	Without this, a 2xx carrying HTML — a proxy error page, say —
			//	resolves as `{}` cast to a FileDto and the upload reports success.
			if (!isFileDto(body))
				return reject(
					new ApiError(xhr.status, "Upload succeeded but the server's reply was unreadable"),
				);
			resolve(body);
		};

		xhr.onerror = () => reject(new ApiError(0, "Upload failed — check your connection"));
		xhr.onabort = () => reject(new ApiError(0, "Upload cancelled"));

		xhr.send(form);
	});
}

/**
 * The same silent refresh-and-retry `apiRequest` gives every other call, which
 * this one cannot inherit because it needs XHR for progress events. Without
 * it, an access token expiring while the page sat open — the *normal* case at
 * 15 minutes, not an error — makes the first upload fail with a bare 401 while
 * the rest of the app quietly heals itself.
 *
 * Progress restarts from 0 on the retry, which is honest: the bytes really are
 * being sent again.
 */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<FileDto> {
	try {
		return await sendUpload(file, options);
	} catch (error) {
		const expired = error instanceof ApiError && error.status === 401;
		//	No session marker means there is no refresh cookie to spend, so the
		//	401 is the final answer rather than a token that aged out.
		if (!expired || !hasSessionMarker()) throw error;

		try {
			await refreshOnce();
		} catch {
			//	The refresh cookie is gone too. The whole app needs to know, not
			//	just whoever happened to be uploading.
			notifySessionExpired();
			throw new ApiError(401, "Your session has expired. Please log in again.", "SESSION_EXPIRED");
		}
		//	One retry only: a second 401 is a real failure, not an expiry.
		return await sendUpload(file, options);
	}
}

export async function listMyFiles(): Promise<FileDto[]> {
	const res = await apiRequest<FileListResponse>("/files?pageSize=100");
	return res.items;
}

export function getFile(id: string): Promise<FileDto> {
	return apiRequest<FileDto>(`/files/${id}`);
}

export function deleteFile(id: string): Promise<null> {
	return apiRequest<null>(`/files/${id}`, { method: "DELETE" });
}
