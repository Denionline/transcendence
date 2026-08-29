import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { CheckIcon, Undo2Icon, XIcon } from "lucide-react";
import ArtistCard from "./ArtistCard";
import ArtistDetailsModal from "./ArtistDetailsModal";
import DiscreetFriendAction from "../../friends/components/DiscreetFriendAction";
import type { Artist } from "../types";
import { useTranslation } from "react-i18next";

const EXIT_MS = 260;
const SWIPE_THRESHOLD = 100;
const TAP_THRESHOLD = 6;

interface MobileArtistStackProps {
	artists: Artist[];
	/** Discipline slugs currently checked in the sidebar filter — passed through to highlight matching tags. */
	selectedDisciplines?: Set<string>;
	onSwipe?: (artist: Artist, liked: boolean) => void;
}

export default function MobileArtistStack({
	artists,
	selectedDisciplines,
	onSwipe,
}: MobileArtistStackProps) {
	const { t } = useTranslation();
	const [index, setIndex] = useState(0);
	const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
	const [exitDir, setExitDir] = useState<1 | -1 | 0>(0);
	const [detailArtist, setDetailArtist] = useState<Artist | null>(null);
	const startRef = useRef<{ x: number; y: number } | null>(null);
	const wasDragRef = useRef(false);
	// There's no way to revert a swipe already sent to the backend — Undo only
	// rewinds this component's local position pointer, it never deletes the
	// recorded Swipe row. Without this, redeciding an undone card in the
	// opposite direction would silently no-op server-side (the backend treats
	// the repeat as SWIPE_EXISTS) while the UI happily animated away as if the
	// new decision had taken effect, leaving the user's real decision (and any
	// resulting match) stuck on whatever they picked the first time.
	const decidedRef = useRef<Map<number, 1 | -1>>(new Map());

	const stackItems = [artists[index], artists[index + 1]].filter((a): a is Artist => Boolean(a));

	function commitSwipe(dir: 1 | -1) {
		if (exitDir || index >= artists.length) return;
		const decided = decidedRef.current.get(index);
		// Already decided this card the other way — reject the gesture instead
		// of pretending it changed anything.
		if (decided !== undefined && decided !== dir) {
			setDrag({ x: 0, y: 0, dragging: false });
			return;
		}
		if (decided === undefined) {
			if (front) onSwipe?.(front, dir === 1);
			decidedRef.current.set(index, dir);
		}
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
		wasDragRef.current = false;
		setDrag({ x: 0, y: 0, dragging: true });
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
		if (!startRef.current) return;
		const dx = e.clientX - startRef.current.x;
		const dy = e.clientY - startRef.current.y;
		if (Math.hypot(dx, dy) > TAP_THRESHOLD) wasDragRef.current = true;
		setDrag({ x: dx, y: dy, dragging: true });
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

	// Pointer capture retargets the compatibility `click` event to this wrapper
	// (the capturing element) rather than whatever was actually tapped, so tap
	// handling for the card body is dispatched from here.
	function handleFrontClick() {
		const wasDrag = wasDragRef.current;
		wasDragRef.current = false;
		if (wasDrag || !front) return;
		setDetailArtist(front);
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
								onClick={handleFrontClick}
							>
								<ArtistCard
									artist={artist}
									size="stack"
									selectedDisciplines={selectedDisciplines}
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
							className="pointer-events-none absolute inset-0 z-0 scale-95 translate-y-3 opacity-60 transition-all duration-200 ease-out"
						>
							<ArtistCard artist={artist} size="stack" selectedDisciplines={selectedDisciplines} />
						</div>
					);
				})}

				{!front && (
					<div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
						<p className="font-medium">{t("deck.allCaughtUp")}</p>
						<p className="text-sm">{t("deck.checkBackForArtists")}</p>
					</div>
				)}
			</div>

			<div className="mt-6 flex items-center justify-center gap-4">
				<button
					type="button"
					onClick={handleUndo}
					disabled={!canUndo}
					aria-label={t("deck.undo")}
					className="btn btn-circle border-base-content/15 bg-base-100 transition-transform duration-150 hover:scale-110 disabled:opacity-30"
				>
					<Undo2Icon className="size-4 text-base-content/70" aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => commitSwipe(-1)}
					disabled={!canAct}
					aria-label={t("deck.pass")}
					className="btn btn-circle border-base-content/15 bg-base-100 transition-[background-color,border-color,transform] duration-150 hover:scale-110 hover:border-error/50 hover:bg-error/10 disabled:opacity-30"
				>
					<XIcon className="size-5 text-error" aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => commitSwipe(1)}
					disabled={!canAct}
					aria-label={t("deck.interested")}
					className="btn btn-circle btn-primary btn-lg transition-transform duration-150 hover:scale-110 disabled:opacity-30"
				>
					<CheckIcon className="size-6" aria-hidden="true" />
				</button>
			</div>

			<ArtistDetailsModal
				artist={detailArtist}
				selectedDisciplines={selectedDisciplines}
				onClose={() => setDetailArtist(null)}
				onPass={() => {
					if (detailArtist && detailArtist.id === front?.id) commitSwipe(-1);
				}}
				onInterested={() => {
					if (detailArtist && detailArtist.id === front?.id) commitSwipe(1);
				}}
				friendSlot={
					detailArtist && (
						<DiscreetFriendAction key={detailArtist.userId} userId={detailArtist.userId} />
					)
				}
			/>
		</div>
	);
}
