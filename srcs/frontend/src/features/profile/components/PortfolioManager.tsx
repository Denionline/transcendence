import { type ChangeEvent, useRef, useState } from "react";
import {
	FileIcon,
	ImageIcon,
	ImagesIcon,
	Music2Icon,
	PlayIcon,
	Trash2Icon,
	VideoIcon,
} from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { deleteFile, uploadFile } from "../../files/api";
import { FILE_RULES } from "../../files/constants";
import { validationErrorFor } from "../../files/schemas";
import type { FileDto, FileType } from "../../files/types";
import { useTranslation } from "react-i18next";

type UploadableType = Exclude<FileType, "document">;

interface AddTileConfig {
	type: UploadableType;
	labelKey: string;
	icon: typeof ImageIcon;
}

const ADD_TILES: AddTileConfig[] = [
	{ type: "image", labelKey: "portfolio.photo", icon: ImageIcon },
	{ type: "video", labelKey: "portfolio.video", icon: VideoIcon },
	{ type: "audio", labelKey: "portfolio.audio", icon: Music2Icon },
];

interface PortfolioManagerProps {
	files: FileDto[];
	onUploaded: (file: FileDto) => void;
	onDeleted: (id: string) => void;
}

/**
 * Lets an artist curate their own public portfolio — add a photo/video/voice
 * note and remove anything. Uploads always go up `public`: this is
 * specifically the gallery shown in the live preview above and on the public
 * profile, not a general-purpose private file store. Hits the real
 * `/api/files` endpoints — see docs/mad/20260819-file-uploads.md.
 */
export default function PortfolioManager({ files, onUploaded, onDeleted }: PortfolioManagerProps) {
	const { t } = useTranslation();
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	async function handleDelete(file: FileDto) {
		setDeletingId(file.id);
		setDeleteError(null);
		try {
			await deleteFile(file.id);
		} catch (err) {
			// A 404 means the server has already lost track of it too — this
			// list was the stale party, so it still comes off locally below.
			if (!(err instanceof ApiError && err.status === 404)) {
				setDeleteError(
					t("portfolio.deleteFailed", { name: file.originalName }) +
						" " +
						(err instanceof Error ? err.message : t("portfolio.tryAgain")),
				);
				setDeletingId(null);
				return;
			}
		}
		setDeletingId(null);
		onDeleted(file.id);
	}

	return (
		<section className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
			<div className="flex items-center gap-2.5 border-b border-base-content/10 p-4">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-base-content/60">
					<ImagesIcon className="size-3.5" aria-hidden="true" />
				</span>
				<div>
					<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
						{t("portfolio.title")}
					</h2>
					<p className="mt-0.5 text-sm text-base-content/60">
						Add photos, a reel or a voice note — they show up in the preview above instantly, and on
						your public profile.
					</p>
				</div>
			</div>

			{deleteError && (
				<div className="alert alert-soft alert-error mx-4 mt-4 py-2 text-sm">
					<span>{deleteError}</span>
				</div>
			)}

			<ul className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5">
				{ADD_TILES.map((tile) => (
					<AddTile key={tile.type} {...tile} onUploaded={onUploaded} />
				))}
				{files.map((file) => (
					<MediaTile
						key={file.id}
						file={file}
						isDeleting={deletingId === file.id}
						onRemove={() => handleDelete(file)}
					/>
				))}
			</ul>
		</section>
	);
}

function AddTile({
	type,
	labelKey,
	icon: Icon,
	onUploaded,
}: AddTileConfig & { onUploaded: (file: FileDto) => void }) {
	const { t } = useTranslation();
	const inputRef = useRef<HTMLInputElement>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const isBusy = progress !== null;

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		// Cleared immediately, or picking the same file twice in a row fires
		// no change event the second time.
		e.target.value = "";
		if (!file) return;

		// Client-side check first — the server repeats it, but there's no
		// reason to push a big file up the wire only to be told no.
		const problem = validationErrorFor(file);
		if (problem) {
			setError(problem);
			return;
		}

		setError(null);
		setProgress(0);
		uploadFile(file, { visibility: "public", onProgress: setProgress })
			.then((uploaded) => onUploaded(uploaded))
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : t("portfolio.uploadFailed"));
			})
			.finally(() => setProgress(null));
	}

	return (
		<li className="relative aspect-square">
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				accept={FILE_RULES[type].mimeTypes.join(",")}
				onChange={handleChange}
			/>
			<button
				type="button"
				disabled={isBusy}
				onClick={() => inputRef.current?.click()}
				aria-label={t("portfolio.add", { type: t(labelKey).toLowerCase() })}
				className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-base-content/15 bg-base-200/30 text-base-content/50 transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-70"
			>
				{isBusy ? (
					<span className="loading loading-spinner loading-sm text-primary" />
				) : (
					<Icon className="size-5" aria-hidden="true" />
				)}
				<span className="px-1 text-center text-[11px] leading-tight font-medium">
					{isBusy ? `${progress}%` : t("portfolio.add", { type: t(labelKey).toLowerCase() })}
				</span>
			</button>
			{error && (
				<span className="absolute inset-x-1 bottom-1 truncate rounded bg-error px-1 py-0.5 text-center text-[9px] font-medium text-error-content">
					{error}
				</span>
			)}
		</li>
	);
}

function MediaTile({
	file,
	isDeleting,
	onRemove,
}: {
	file: FileDto;
	isDeleting: boolean;
	onRemove: () => void;
}) {
	const { t } = useTranslation();
	return (
		<li className="group relative aspect-square animate-[fade-in_200ms_ease-out] overflow-hidden rounded-xl border border-base-content/10 bg-base-200 shadow-sm transition-shadow duration-150 hover:shadow-md">
			{file.type === "image" && (
				<img
					src={file.url}
					alt={file.originalName}
					loading="lazy"
					className="h-full w-full object-cover"
				/>
			)}

			{file.type === "video" && (
				<div className="relative h-full w-full bg-neutral">
					<video src={file.url} preload="metadata" className="h-full w-full object-cover" muted />
					<div className="absolute inset-0 flex items-center justify-center bg-black/25">
						<PlayIcon className="size-6 text-white" aria-hidden="true" />
					</div>
				</div>
			)}

			{file.type === "audio" && (
				<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_12%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_12%,transparent)_8px,transparent_8px,transparent_16px)] p-2 text-center">
					<Music2Icon className="size-5 text-base-content/50" aria-hidden="true" />
					<span className="w-full truncate text-[10px] text-base-content/50">
						{file.originalName}
					</span>
				</div>
			)}

			{file.type === "document" && (
				// Unreachable via the upload flow today (FILE_RULES has no
				// "document" entry) — kept only so an unexpected value renders
				// something sane instead of a blank tile.
				<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-base-300 p-2 text-center">
					<FileIcon className="size-5 text-base-content/50" aria-hidden="true" />
					<span className="w-full truncate text-[10px] text-base-content/50">
						{file.originalName}
					</span>
				</div>
			)}

			<button
				type="button"
				onClick={onRemove}
				disabled={isDeleting}
				aria-label={t("portfolio.remove", { name: file.originalName })}
				className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-error focus-visible:opacity-100 disabled:opacity-100"
			>
				{isDeleting ? (
					<span className="loading loading-spinner loading-xs" />
				) : (
					<Trash2Icon className="size-3.5" aria-hidden="true" />
				)}
			</button>
		</li>
	);
}
