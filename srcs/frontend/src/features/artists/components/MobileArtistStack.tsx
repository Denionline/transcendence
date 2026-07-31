import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { CheckIcon, StarIcon, Undo2Icon, XIcon } from "lucide-react";
import ArtistCard from "./ArtistCard";
import type { Artist } from "../types";

const EXIT_MS = 260;
const SWIPE_THRESHOLD = 100;

interface MobileArtistStackProps {
	artists: Artist[];
}

export default function MobileArtistStack({ artists }: MobileArtistStackProps) {
	const [index, setIndex] = useState(0);
	const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
	const [exitDir, setExitDir] = useState<1 | -1 | 0>(0);
	const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
	const startRef = useRef<{ x: number; y: number } | null>(null);

	const stackItems = [artists[index], artists[index + 1]].filter((a): a is Artist => Boolean(a));

	function toggleSave(id: string) {
		setSavedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function commitSwipe(dir: 1 | -1) {
		if (exitDir || index >= artists.length) return;
		setExitDir(dir);
		setDrag((d) => ({ ...d, dragging: false }));
		window.setTimeout(() => {
			setIndex((i) => i + 1);
			setExitDir(0);
			setDrag({ x: 0, y: 0, dragging: false });
		}, EXIT_MS);
	}

	function handleUndo() {
		if (exitDir || index === 0) return;
		setIndex((i) => Math.max(0, i - 1));
	}

	function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
		if (exitDir) return;
		startRef.current = { x: e.clientX, y: e.clientY };
		setDrag({ x: 0, y: 0, dragging: true });
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
		if (!startRef.current) return;
		setDrag({
			x: e.clientX - startRef.current.x,
			y: e.clientY - startRef.current.y,
			dragging: true,
		});
	}

	function handlePointerUp() {
		if (!startRef.current) return;
		startRef.current = null;
		if (Math.abs(drag.x) > SWIPE_THRESHOLD) {
			commitSwipe(drag.x > 0 ? 1 : -1);
		} else {
			setDrag({ x: 0, y: 0, dragging: false });
		}
	}

	const front = stackItems[0];
	const canUndo = index > 0 && !exitDir;
	const canAct = Boolean(front) && !exitDir;

	const frontStyle: CSSProperties = exitDir
		? {
				transform: `translate(${exitDir * 640}px, ${drag.y}px) rotate(${exitDir * 24}deg)`,
				opacity: 0,
				transition: `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease-in`,
			}
		: drag.dragging
			? {
					transform: `translate(${drag.x}px, ${drag.y * 0.2}px) rotate(${drag.x / 18}deg)`,
					transition: "none",
				}
			: {
					transform: "translate(0px, 0px) rotate(0deg)",
					transition: "transform 280ms cubic-bezier(0.22,1,0.36,1)",
				};

	const dragX = drag.dragging ? drag.x : exitDir ? exitDir * 200 : 0;
	const interestedOpacity = Math.min(Math.max(dragX / 90, 0), 1);
	const passOpacity = Math.min(Math.max(-dragX / 90, 0), 1);

	return (
		<div className="mx-auto flex w-full max-w-sm flex-col items-center overflow-hidden">
			<div className="relative h-[min(66vh,600px)] w-full">
				{stackItems.map((artist, i) => {
					if (i === 0) {
						return (
							<div
								key={artist.id}
								className="absolute inset-0 z-10 touch-none select-none active:cursor-grabbing"
								style={frontStyle}
								onPointerDown={handlePointerDown}
								onPointerMove={handlePointerMove}
								onPointerUp={handlePointerUp}
								onPointerCancel={handlePointerUp}
							>
								<ArtistCard
									artist={artist}
									size="stack"
									saved={savedIds.has(artist.id)}
									onToggleSave={() => toggleSave(artist.id)}
								/>
								<div
									style={{ opacity: interestedOpacity }}
									className="pointer-events-none absolute top-10 left-6 -rotate-12 rounded-lg border-4 border-primary px-3 py-1 text-xl font-black tracking-wider text-primary"
								>
									Interested
								</div>
								<div
									style={{ opacity: passOpacity }}
									className="pointer-events-none absolute top-10 right-6 rotate-12 rounded-lg border-4 border-error px-3 py-1 text-xl font-black tracking-wider text-error"
								>
									Pass
								</div>
							</div>
						);
					}
					return (
						<div
							key={artist.id}
							className="absolute inset-0 z-0 scale-95 translate-y-3 opacity-60 transition-all duration-200 ease-out"
						>
							<ArtistCard artist={artist} size="stack" />
						</div>
					);
				})}

				{!front && (
					<div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
						<p className="font-medium">You&rsquo;re all caught up</p>
						<p className="text-sm">Check back later for new artists.</p>
					</div>
				)}
			</div>

			<div className="mt-6 flex items-center justify-center gap-4">
				<button
					type="button"
					onClick={handleUndo}
					disabled={!canUndo}
					aria-label="Undo"
					className="btn btn-circle border-base-content/15 bg-base-100 disabled:opacity-30"
				>
					<Undo2Icon className="size-4 text-base-content/70" aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => commitSwipe(-1)}
					disabled={!canAct}
					aria-label="Pass"
					className="btn btn-circle border-base-content/15 bg-base-100 disabled:opacity-30"
				>
					<XIcon className="size-5 text-error" aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => front && toggleSave(front.id)}
					disabled={!canAct}
					aria-label="Save"
					aria-pressed={front ? savedIds.has(front.id) : undefined}
					className="btn btn-circle border-base-content/15 bg-base-100 disabled:opacity-30"
				>
					<StarIcon
						className={`size-4 ${front && savedIds.has(front.id) ? "fill-primary text-primary" : "text-base-content/70"}`}
						aria-hidden="true"
					/>
				</button>
				<button
					type="button"
					onClick={() => commitSwipe(1)}
					disabled={!canAct}
					aria-label="Interested"
					className="btn btn-circle btn-primary btn-lg disabled:opacity-30"
				>
					<CheckIcon className="size-6" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
