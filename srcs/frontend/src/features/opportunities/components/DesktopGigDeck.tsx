import { useRef, useState } from "react";
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
}

export default function DesktopGigDeck({ gigs }: DesktopGigDeckProps) {
	const [slots, setSlots] = useState<Slot[]>(() =>
		gigs.slice(0, SLOT_COUNT).map((gig) => ({ current: gig, outgoing: null, exitDir: null })),
	);
	const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
	const [detail, setDetail] = useState<{ gig: GigListing; index: number } | null>(null);
	const nextIndexRef = useRef(SLOT_COUNT);

	function decide(index: number, dir: 1 | -1) {
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
									<GigCard
										gig={current}
										saved={savedIds.has(current.id)}
										onToggleSave={() => toggleSave(current.id)}
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
									<GigCard gig={outgoing} saved={savedIds.has(outgoing.id)} />
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
				saved={detail ? savedIds.has(detail.gig.id) : false}
				onClose={() => setDetail(null)}
				onToggleSave={() => detail && toggleSave(detail.gig.id)}
				onPass={() => detail && decide(detail.index, -1)}
				onInterested={() => detail && decide(detail.index, 1)}
			/>
		</>
	);
}
