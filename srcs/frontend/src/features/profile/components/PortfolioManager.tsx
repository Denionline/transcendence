import { type ChangeEvent, useRef, useState } from "react";
import { ImageIcon, ImagesIcon, Music2Icon, PlayIcon, Trash2Icon, VideoIcon } from "lucide-react";
import type { ProfileMediaItem } from "../../artists/types";

type MediaType = ProfileMediaItem["type"];

interface AddTileConfig {
	type: MediaType;
	label: string;
	accept: string;
	icon: typeof ImageIcon;
}

const ADD_TILES: AddTileConfig[] = [
	{ type: "image", label: "Photo", accept: "image/jpeg,image/png,image/webp", icon: ImageIcon },
	{ type: "video", label: "Video", accept: "video/mp4,video/webm", icon: VideoIcon },
	{ type: "audio", label: "Audio", accept: "audio/mpeg,audio/mp4,audio/wav", icon: Music2Icon },
];

// Rough parity with what a real upload endpoint would cap per type — no
// reason to let someone pick a 300 MB video only to find out client-side
// nothing is even going to try sending it anywhere yet.
const MAX_BYTES: Record<MediaType, number> = {
	image: 5 * 1024 * 1024,
	audio: 15 * 1024 * 1024,
	video: 50 * 1024 * 1024,
};
const MAX_LABEL: Record<MediaType, string> = { image: "5 MB", audio: "15 MB", video: "50 MB" };

interface PortfolioManagerProps {
	media: ProfileMediaItem[];
	onAdd: (item: ProfileMediaItem) => void;
	onRemove: (id: string) => void;
}

/**
 * Lets an artist curate their own gallery — add a photo/video/voice note and
 * remove anything, including the seeded demo items. There's no upload
 * endpoint yet (see mockProfileMedia.ts), so this stays entirely client-side:
 * files are read locally and played back from an object URL, not sent
 * anywhere. Everything added here is gone on refresh — that limitation is
 * called out in the UI rather than hidden.
 */
export default function PortfolioManager({ media, onAdd, onRemove }: PortfolioManagerProps) {
	return (
		<section className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
			<div className="flex items-center gap-2.5 border-b border-base-content/10 p-4">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-base-content/60">
					<ImagesIcon className="size-3.5" aria-hidden="true" />
				</span>
				<div>
					<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
						Portfolio
					</h2>
					<p className="mt-0.5 text-sm text-base-content/60">
						Add photos, a reel or a voice note — they show up in the preview above instantly.
						Nothing here is uploaded anywhere yet, so it resets on refresh.
					</p>
				</div>
			</div>

			<ul className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5">
				{ADD_TILES.map((tile) => (
					<AddTile key={tile.type} {...tile} onAdd={onAdd} />
				))}
				{media.map((item) => (
					<MediaTile key={item.id} item={item} onRemove={() => onRemove(item.id)} />
				))}
			</ul>
		</section>
	);
}

function AddTile({
	type,
	label,
	accept,
	icon: Icon,
	onAdd,
}: AddTileConfig & { onAdd: (item: ProfileMediaItem) => void }) {
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

		if (file.size > MAX_BYTES[type]) {
			setError(`Too big — max ${MAX_LABEL[type]}.`);
			return;
		}

		setError(null);
		setProgress(0);

		// Reads the file locally so the progress readout reflects something
		// real instead of a fake timer — there's no upload endpoint to report
		// actual network progress from yet. Playback itself uses an object
		// URL straight off the File, not the bytes read here.
		const reader = new FileReader();
		reader.onprogress = (event) => {
			if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
		};
		reader.onerror = () => {
			setError("Couldn't read that file.");
			setProgress(null);
		};
		reader.onload = () => {
			onAdd({
				id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				type,
				url: URL.createObjectURL(file),
				label: file.name,
			});
			setProgress(null);
		};
		reader.readAsArrayBuffer(file);
	}

	return (
		<li className="relative aspect-square">
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				accept={accept}
				onChange={handleChange}
			/>
			<button
				type="button"
				disabled={isBusy}
				onClick={() => inputRef.current?.click()}
				aria-label={`Add ${label.toLowerCase()}`}
				className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-base-content/15 bg-base-200/30 text-base-content/50 transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-70"
			>
				{isBusy ? (
					<span className="loading loading-spinner loading-sm text-primary" />
				) : (
					<Icon className="size-5" aria-hidden="true" />
				)}
				<span className="px-1 text-center text-[11px] leading-tight font-medium">
					{isBusy ? `${progress}%` : `Add ${label.toLowerCase()}`}
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

function MediaTile({ item, onRemove }: { item: ProfileMediaItem; onRemove: () => void }) {
	return (
		<li className="group relative aspect-square animate-[fade-in_200ms_ease-out] overflow-hidden rounded-xl border border-base-content/10 bg-base-200 shadow-sm transition-shadow duration-150 hover:shadow-md">
			{item.type === "image" && (
				<img
					src={item.url}
					alt={item.label ?? "Portfolio photo"}
					className="h-full w-full object-cover"
				/>
			)}

			{item.type === "video" && (
				<div className="relative h-full w-full bg-neutral">
					{item.posterUrl ? (
						<img src={item.posterUrl} alt="" className="h-full w-full object-cover" />
					) : (
						<video src={item.url} className="h-full w-full object-cover" muted />
					)}
					<div className="absolute inset-0 flex items-center justify-center bg-black/25">
						<PlayIcon className="size-6 text-white" aria-hidden="true" />
					</div>
				</div>
			)}

			{item.type === "audio" && (
				<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_12%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_12%,transparent)_8px,transparent_8px,transparent_16px)] p-2 text-center">
					<Music2Icon className="size-5 text-base-content/50" aria-hidden="true" />
					{item.label && (
						<span className="w-full truncate text-[10px] text-base-content/50">{item.label}</span>
					)}
				</div>
			)}

			<button
				type="button"
				onClick={onRemove}
				aria-label={`Remove ${item.label ?? item.type}`}
				className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-error focus-visible:opacity-100"
			>
				<Trash2Icon className="size-3.5" aria-hidden="true" />
			</button>
		</li>
	);
}
