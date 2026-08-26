import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ImageIcon,
	Music2Icon,
	PauseIcon,
	PlayIcon,
	VideoIcon,
} from "lucide-react";
import type { ProfileMediaItem } from "../types";

const SWIPE_THRESHOLD = 60;

const TYPE_ICON = { image: ImageIcon, video: VideoIcon, audio: Music2Icon } as const;

interface ProfileMediaGalleryProps {
	media: ProfileMediaItem[];
	/** Used for alt text and accessible labels, e.g. "Maya Souza". */
	name: string;
	/** Rendered above the viewport's top-left corner — the caller's own availability badge. */
	topLeftSlot?: ReactNode;
	/** Placeholder text shown in the empty-media state, e.g. "Hirer photo / reel". */
	emptyLabel?: string;
}

/**
 * Swipeable/keyboard-navigable viewer for a profile's photos, reels, and voice
 * notes. Callers should mount this with `key={artist.id}` (or equivalent) so a
 * newly opened profile always starts on its first slide — this component keeps
 * no logic of its own for detecting "it's a different profile now".
 */
export default function ProfileMediaGallery({
	media,
	name,
	topLeftSlot,
	emptyLabel = "Artist photo / reel",
}: ProfileMediaGalleryProps) {
	const [index, setIndex] = useState(0);
	const [dragX, setDragX] = useState(0);
	const [dragging, setDragging] = useState(false);
	const dragStartRef = useRef(0);

	const clampedIndex = Math.min(index, media.length - 1);
	const current = media[clampedIndex];

	function goTo(next: number) {
		setIndex(((next % media.length) + media.length) % media.length);
	}

	// Left/right paging while the gallery is open — skipped while a text/range
	// input has focus so it doesn't hijack the audio player's seek bar.
	useEffect(() => {
		if (media.length < 2) return;
		function handleKeyDown(e: KeyboardEvent) {
			const tag = (e.target as HTMLElement | null)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + media.length) % media.length);
			else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % media.length);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [media.length]);

	function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
		// Video/audio slides have their own interactive controls (scrubber, play
		// button) — capturing the pointer here for a swipe gesture would fight
		// with dragging those, so only photos swipe.
		if (media.length < 2 || current?.type !== "image") return;
		// The prev/next arrows sit inside this same viewport. Capturing the
		// pointer on this container when the press started on a button
		// retargets the button's own mouseup/click to the container instead —
		// the arrow would visually depress but never fire. Let button presses
		// through untouched.
		if ((e.target as HTMLElement).closest("button")) return;
		dragStartRef.current = e.clientX;
		setDragging(true);
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
		if (!dragging) return;
		setDragX(e.clientX - dragStartRef.current);
	}

	function handlePointerUp() {
		if (!dragging) return;
		setDragging(false);
		if (dragX <= -SWIPE_THRESHOLD) goTo(clampedIndex + 1);
		else if (dragX >= SWIPE_THRESHOLD) goTo(clampedIndex - 1);
		setDragX(0);
	}

	if (!current) {
		return (
			<div className="relative aspect-16/9 bg-neutral bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_18%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_18%,transparent)_10px,transparent_10px,transparent_20px)]">
				{topLeftSlot && <div className="absolute top-3 left-3 z-10">{topLeftSlot}</div>}
				<span className="absolute inset-0 flex items-center justify-center text-xs tracking-wide text-base-content/40 uppercase">
					{emptyLabel}
				</span>
			</div>
		);
	}

	const TypeIcon = TYPE_ICON[current.type];

	return (
		<div className="flex flex-col">
			<div
				className="group relative aspect-16/9 touch-pan-y overflow-hidden bg-neutral select-none"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
			>
				<div
					style={{
						transform: `translateX(${dragX}px)`,
						transition: dragging ? "none" : "transform 200ms ease-out",
					}}
					className="absolute inset-0"
				>
					<GallerySlide item={current} name={name} />
				</div>

				{topLeftSlot && <div className="absolute top-3 left-3 z-10">{topLeftSlot}</div>}

				{/* right-14, not right-3: Modal's own close button sits at top-3 right-3
				    on top of this same corner — this clears it instead of overlapping. */}
				<div className="absolute top-3 right-14 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
					<TypeIcon className="size-3.5" aria-hidden="true" />
					<span>
						{clampedIndex + 1} / {media.length}
					</span>
				</div>

				{media.length > 1 && (
					<>
						<button
							type="button"
							onClick={() => goTo(clampedIndex - 1)}
							aria-label="Previous media"
							className="btn btn-circle btn-sm absolute top-1/2 left-2 z-10 -translate-y-1/2 border-none bg-black/40 text-white opacity-70 backdrop-blur transition-opacity duration-150 group-hover:opacity-100 hover:bg-black/60"
						>
							<ChevronLeftIcon className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => goTo(clampedIndex + 1)}
							aria-label="Next media"
							className="btn btn-circle btn-sm absolute top-1/2 right-2 z-10 -translate-y-1/2 border-none bg-black/40 text-white opacity-70 backdrop-blur transition-opacity duration-150 group-hover:opacity-100 hover:bg-black/60"
						>
							<ChevronRightIcon className="size-4" aria-hidden="true" />
						</button>
					</>
				)}
			</div>

			{media.length > 1 && (
				<div className="flex gap-1.5 overflow-x-auto border-b border-base-content/10 bg-base-100 p-2.5">
					{media.map((item, i) => (
						<Thumbnail
							key={item.id}
							item={item}
							active={i === clampedIndex}
							onClick={() => goTo(i)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function GallerySlide({ item, name }: { item: ProfileMediaItem; name: string }) {
	if (item.type === "image") {
		return (
			<img
				src={item.url}
				alt={`${name}'s ${item.label ?? "photo"}`}
				className="h-full w-full object-cover"
			/>
		);
	}
	if (item.type === "video") {
		return (
			<video
				key={item.id}
				controls
				preload="metadata"
				poster={item.posterUrl}
				className="h-full w-full bg-black object-contain"
				aria-label={`${name}'s ${item.label ?? "video"}`}
			>
				<source src={item.url} />
			</video>
		);
	}
	// Keyed by item.id: switching between two audio slides should start the new
	// clip's player fresh (not play/paused, at 0:00) rather than inheriting
	// whatever local state the previous clip's instance was left in.
	return <AudioSlide key={item.id} item={item} name={name} />;
}

function Thumbnail({
	item,
	active,
	onClick,
}: {
	item: ProfileMediaItem;
	active: boolean;
	onClick: () => void;
}) {
	const TypeIcon = TYPE_ICON[item.type];
	const thumbUrl = item.type === "audio" ? undefined : (item.posterUrl ?? item.url);

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={item.label ?? item.type}
			aria-current={active}
			className={`relative aspect-16/9 h-12 shrink-0 overflow-hidden rounded-md transition-[outline-color] ${
				active ? "outline-2 outline-offset-1 outline-primary" : "opacity-60 hover:opacity-100"
			}`}
		>
			{thumbUrl ? (
				<img src={thumbUrl} alt="" className="h-full w-full object-cover" />
			) : (
				<div className="flex h-full w-full items-center justify-center bg-base-300">
					<Music2Icon className="size-4 text-base-content/50" aria-hidden="true" />
				</div>
			)}
			{item.type === "video" && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/25">
					<VideoIcon className="size-4 text-white" aria-hidden="true" />
				</div>
			)}
			{!active && (
				<TypeIcon
					className="absolute right-1 bottom-1 size-3 text-white drop-shadow"
					aria-hidden="true"
				/>
			)}
		</button>
	);
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds)) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
}

/** A custom-styled player — the native `<audio controls>` widget looks out of
 *  place floating on a dark hero panel, so this drives a hidden element instead. */
function AudioSlide({ item, name }: { item: ProfileMediaItem; name: string }) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	function togglePlay() {
		const audio = audioRef.current;
		if (!audio) return;
		if (audio.paused) audio.play().catch(() => setPlaying(false));
		else audio.pause();
	}

	function handleSeek(e: ChangeEvent<HTMLInputElement>) {
		const audio = audioRef.current;
		if (!audio) return;
		audio.currentTime = Number(e.target.value);
		setCurrentTime(audio.currentTime);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_18%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_18%,transparent)_10px,transparent_10px,transparent_20px)] px-8">
			<audio
				ref={audioRef}
				src={item.url}
				preload="metadata"
				aria-label={`${name}'s ${item.label ?? "audio"}`}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => setPlaying(false)}
				onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
				onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
			/>

			<button
				type="button"
				onClick={togglePlay}
				aria-label={playing ? "Pause" : "Play"}
				className="btn btn-circle btn-primary btn-lg shadow-lg transition-transform duration-150 hover:scale-105"
			>
				{playing ? (
					<PauseIcon className="size-6" aria-hidden="true" />
				) : (
					<PlayIcon className="ml-0.5 size-6" aria-hidden="true" />
				)}
			</button>

			<div className="flex w-full max-w-xs items-center gap-2 text-xs font-medium text-white/90">
				<span className="tabular-nums">{formatTime(currentTime)}</span>
				<input
					type="range"
					min={0}
					max={duration || 0}
					step={0.1}
					value={Math.min(currentTime, duration || 0)}
					onChange={handleSeek}
					aria-label="Seek"
					className="range range-primary range-xs flex-1"
				/>
				<span className="tabular-nums">{formatTime(duration)}</span>
			</div>

			{item.label && <p className="text-sm font-medium text-white/80">{item.label}</p>}
		</div>
	);
}
