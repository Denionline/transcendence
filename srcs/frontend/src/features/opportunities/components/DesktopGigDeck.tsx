import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import GigCard from "./GigCard";
import GigDetailsModal from "./GigDetailsModal";
import type { GigListing } from "../gigTypes";

const SLOT_COUNT = 3;
const EXIT_MS = 340;

interface Slot {
	current: GigListing | null;
	outgoing: GigListing | null;
	exitDir: 1 | -1 | null;
}

interface DesktopGigDeckProps {
	gigs: GigListing[];
	/** Discipline slugs currently checked in the sidebar filter — passed through to highlight the matching category badge. */
	selectedDisciplines?: Set<string>;
	onSwipe?: (gig: GigListing, liked: boolean) => void;
}

export default function DesktopGigDeck({
	gigs,
	selectedDisciplines,
	onSwipe,
}: DesktopGigDeckProps) {
	// Always start with exactly SLOT_COUNT cells, even if fewer gigs are
	// available yet — a real (rather than decorative) filter can legitimately
	// leave the pool smaller than a full deck, and mounting with fewer slots
	// than SLOT_COUNT would silently drop the "no more gigs" placeholder for
	// the missing ones instead of showing it, making a working filter look
	// like it hadn't searched at all.
	const [slots, setSlots] = useState<Slot[]>(() =>
		Array.from({ length: SLOT_COUNT }, (_, i) => ({
			current: gigs[i] ?? null,
			outgoing: null,
			exitDir: null,
		})),
	);
	const [detail, setDetail] = useState<{ gig: GigListing; index: number } | null>(null);
	const nextIndexRef = useRef(SLOT_COUNT);

	// The replacement for a swiped card arrives asynchronously — the parent
	// only fetches it once the swipe itself is recorded — so `gigs` grows
	// after this component has already rendered the empty slot. Backfill any
	// empty slot as soon as a new candidate shows up, instead of waiting for
	// another interaction to notice it.
	useEffect(() => {
		setSlots((prev) => {
			const filled = prev.map((slot) => {
				if (slot.current) return slot;
				if (nextIndexRef.current >= gigs.length) return slot;
				const gig = gigs[nextIndexRef.current];
				nextIndexRef.current += 1;
				return { ...slot, current: gig };
			});
			return filled.some((slot, i) => slot !== prev[i]) ? filled : prev;
		});
	}, [gigs]);

	function decide(index: number, dir: 1 | -1) {
		const slot = slots[index];
		if (slot?.current && !slot.outgoing) onSwipe?.(slot.current, dir === 1);
		setSlots((prev) => {
			const slot = prev[index];
			if (!slot.current || slot.outgoing) return prev;
			const nextGig = nextIndexRef.current < gigs.length ? gigs[nextIndexRef.current] : null;
			if (nextGig) nextIndexRef.current += 1;
			const next = [...prev];
			next[index] = { current: nextGig, outgoing: slot.current, exitDir: dir };
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
									<GigCard
										gig={current}
										selectedDisciplines={selectedDisciplines}
										onPass={() => decide(index, -1)}
										onInterested={() => decide(index, 1)}
										onOpenDetails={() => setDetail({ gig: current, index })}
									/>
								</div>
							)}

							{outgoing && (
								<div
									key={outgoing.id}
									style={exitStyle(exitDir)}
									className="pointer-events-none absolute inset-0 z-10"
								>
									<GigCard gig={outgoing} selectedDisciplines={selectedDisciplines} />
								</div>
							)}

							{!current && !outgoing && (
								<div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
									<p className="font-medium">No more gigs</p>
									<p className="text-sm">Check back later.</p>
								</div>
							)}
						</div>
					);
				})}
			</div>

			<GigDetailsModal
				gig={detail?.gig ?? null}
				selectedDisciplines={selectedDisciplines}
				onClose={() => setDetail(null)}
				onPass={() => detail && decide(detail.index, -1)}
				onInterested={() => detail && decide(detail.index, 1)}
			/>
		</>
	);
}
