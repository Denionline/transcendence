import { apiRequest, ApiError } from "../../lib/apiClient";
import { getAccessToken } from "../auth/api";
import type { FileDto, FileListResponse, FileVisibility } from "./types";

interface UploadOptions {
	visibility?: FileVisibility;
	onProgress?: (percent: number) => void;
	signal?: AbortSignal;
}

//	Deliberately narrow: the two fields every caller dereferences, not a
//	full-schema validation. The rest of this client casts its responses too —
//	`apiRequest` included — and validating one endpoint thoroughly while the
//	others stay unchecked would buy less than it costs. This exists to close
//	the one hole XHR opens that fetch does not.
function isFileDto(body: unknown): body is FileDto {
	if (typeof body !== "object" || body === null) return false;
	const candidate = body as Partial<FileDto>;
	return typeof candidate.id === "string" && typeof candidate.url === "string";
}

/**
 * Deliberately not routed through `apiRequest`.
 *
 * Two reasons, and both are structural rather than stylistic: `apiRequest`
 * hardcodes `Content-Type: application/json`, which a multipart body must not
 * carry — the browser has to set it itself, because the boundary is part of
 * the header and only the browser knows the boundary it generated. And
 * `fetch()` cannot report upload progress at all, so a progress bar needs
 * XMLHttpRequest whether we like it or not.
 */
export function uploadFile(file: File, options: UploadOptions = {}): Promise<FileDto> {
	return new Promise((resolve, reject) => {
		const form = new FormData();
		form.append("file", file);
		if (options.visibility) form.append("visibility", options.visibility);

		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/files");
		xhr.withCredentials = true;

		const token = getAccessToken();
		if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
		//	No setRequestHeader("Content-Type", ...) here. On purpose.

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

			//	`apiRequest` gets this for free: fetch's `res.json()` rejects on a
			//	body that will not parse. The catch above swallows exactly that,
			//	so without this check a 2xx carrying HTML — a proxy error page,
			//	say — resolves as `{}` cast to a FileDto, and the caller pushes a
			//	gallery entry whose id and url are undefined. The upload reports
			//	success and the failure surfaces later, as a broken <img>.
			if (!isFileDto(body))
				return reject(
					new ApiError(xhr.status, "Upload succeeded but the server's reply was unreadable"),
				);
			resolve(body);
		};

		xhr.onerror = () => reject(new ApiError(0, "Upload failed — check your connection"));
		xhr.onabort = () => reject(new ApiError(0, "Upload cancelled"));
		options.signal?.addEventListener("abort", () => xhr.abort(), { once: true });

		xhr.send(form);
	});
}

/** The caller's own files, both visibilities. Nobody else's are ever listed. */
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
