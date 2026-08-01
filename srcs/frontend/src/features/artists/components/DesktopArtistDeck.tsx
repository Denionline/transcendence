import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import ArtistCard from "./ArtistCard";
import ArtistDetailsModal from "./ArtistDetailsModal";
import type { Artist } from "../types";

const SLOT_COUNT = 3;
const EXIT_MS = 340;

interface Slot {
	current: Artist | null;
	outgoing: Artist | null;
	exitDir: 1 | -1 | null;
}

interface DesktopArtistDeckProps {
	artists: Artist[];
	onInterested?: (artist: Artist) => void;
}

export default function DesktopArtistDeck({ artists, onInterested }: DesktopArtistDeckProps) {
	const [slots, setSlots] = useState<Slot[]>(() =>
		artists
			.slice(0, SLOT_COUNT)
			.map((artist) => ({ current: artist, outgoing: null, exitDir: null })),
	);
	const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
	const [detail, setDetail] = useState<{ artist: Artist; index: number } | null>(null);
	const nextIndexRef = useRef(SLOT_COUNT);

	function decide(index: number, dir: 1 | -1) {
		const slot = slots[index];
		if (slot?.current && !slot.outgoing && dir === 1) onInterested?.(slot.current);
		setSlots((prev) => {
			const slot = prev[index];
			if (!slot.current || slot.outgoing) return prev;
			const nextArtist =
				nextIndexRef.current < artists.length ? artists[nextIndexRef.current] : null;
			if (nextArtist) nextIndexRef.current += 1;
			const next = [...prev];
			next[index] = { current: nextArtist, outgoing: slot.current, exitDir: dir };
			return next;
		});
		window.setTimeout(() => {
			setSlots((prev) => {
				const slot = prev[index];
				if (!slot.outgoing) return prev;
				const next = [...prev];
				next[index] = { ...slot, outgoing: null, exitDir: null };
				return next;
			});
		}, EXIT_MS);
	}

	function toggleSave(id: string) {
		setSavedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function exitStyle(dir: 1 | -1 | null): CSSProperties {
		if (!dir) return {};
		return {
			transform: `translate(${dir * 420}px, -22px) rotate(${dir * 14}deg) scale(0.92)`,
			opacity: 0,
			transition: "transform 340ms cubic-bezier(0.55,0,1,0.45), opacity 260ms ease-in",
		};
	}

	return (
		<>
			<div className="grid h-[calc(100vh-19rem)] min-h-105 grid-cols-3 gap-6 overflow-hidden">
				{slots.map((slot, index) => {
					const { current, outgoing, exitDir } = slot;
					return (
						<div key={index} className="relative">
							{current && (
								<div
									key={current.id}
									className="absolute inset-0 z-0 animate-[swipe-card-in_360ms_cubic-bezier(0.16,1,0.3,1)]"
								>
									<ArtistCard
										artist={current}
										saved={savedIds.has(current.id)}
										onToggleSave={() => toggleSave(current.id)}
										onPass={() => decide(index, -1)}
										onInterested={() => decide(index, 1)}
										onOpenDetails={() => setDetail({ artist: current, index })}
									/>
								</div>
							)}

							{outgoing && (
								<div
									key={outgoing.id}
									style={exitStyle(exitDir)}
									className="pointer-events-none absolute inset-0 z-10"
								>
									<ArtistCard artist={outgoing} saved={savedIds.has(outgoing.id)} />
								</div>
							)}

							{!current && !outgoing && (
								<div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
									<p className="font-medium">No more matches</p>
									<p className="text-sm">Check back later.</p>
								</div>
							)}
						</div>
					);
				})}
			</div>

			<ArtistDetailsModal
				artist={detail?.artist ?? null}
				saved={detail ? savedIds.has(detail.artist.id) : false}
				onClose={() => setDetail(null)}
				onToggleSave={() => detail && toggleSave(detail.artist.id)}
				onPass={() => detail && decide(detail.index, -1)}
				onInterested={() => detail && decide(detail.index, 1)}
			/>
		</>
	);
}
