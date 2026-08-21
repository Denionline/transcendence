import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { uploadFile } from "../api";
import { ACCEPTED_MIME_TYPES } from "../constants";
import { validationErrorFor } from "../schemas";
import type { FileDto, FileVisibility } from "../types";

interface FileUploadProps {
	visibility?: FileVisibility;
	onUploaded: (file: FileDto) => void;
	label?: string;
}

export default function FileUpload({
	visibility = "public",
	onUploaded,
	label = "Add to portfolio",
}: FileUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const isUploading = progress !== null;

	async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		//	Clear the input straight away, or picking the same file twice in a
		//	row fires no change event the second time.
		event.target.value = "";
		if (!file) return;

		//	Client-side check first — the server repeats it, but there is no
		//	reason to push 200 MB up the wire to be told no.
		const problem = validationErrorFor(file);
		if (problem) {
			setError(problem);
			return;
		}

		setError(null);
		setProgress(0);
		try {
			const uploaded = await uploadFile(file, { visibility, onProgress: setProgress });
			onUploaded(uploaded);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setProgress(null);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				accept={ACCEPTED_MIME_TYPES.join(",")}
				onChange={handleChange}
			/>

			<button
				type="button"
				className="btn btn-primary btn-sm w-fit"
				disabled={isUploading}
				onClick={() => inputRef.current?.click()}
			>
				{isUploading ? (
					<span className="loading loading-spinner loading-xs" />
				) : (
					<UploadIcon className="size-4" />
				)}
				{label}
			</button>

			{isUploading && (
				<progress
					className="progress progress-primary w-full max-w-sm"
					value={progress}
					max={100}
					aria-label="Upload progress"
				/>
			)}

			{error && (
				<div className="alert alert-error alert-soft py-2 text-sm">
					<span>{error}</span>
				</div>
			)}

			<p className="text-xs text-base-content/50">
				JPEG, PNG or WebP up to 5 MB · MP3 or M4A up to 15 MB · MP4 up to 50 MB
			</p>
		</div>
	);
}
