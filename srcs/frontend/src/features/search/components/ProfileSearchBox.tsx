import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { searchProfiles } from "../api";
import ProfileResultModal from "./ProfileResultModal";
import { useAuth } from "../../auth/hooks/useAuth";
import type { SearchProfileResult } from "../types";

interface ProfileSearchBoxProps {
	placeholder: string;
	className?: string;
	/** Fires once a result is picked — e.g. to close the mobile menu it lives in. */
	onSelect?: () => void;
}

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 5;

/** Name-only search over artist/hirer profiles, with up to 5 suggestions below the field. */
export default function ProfileSearchBox({
	placeholder,
	className,
	onSelect,
}: ProfileSearchBoxProps) {
	const { user } = useAuth();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchProfileResult[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Clearing the field should hide the dropdown immediately, not wait for
	// the debounced effect below — handled right in the change handler so
	// there's no state to reset from inside an effect.
	function handleQueryChange(value: string) {
		setQuery(value);
		if (value.trim() === "") {
			setResults([]);
			setIsOpen(false);
		}
	}

	// Only artists and hirers see this box (it lives in AppLayout's navbar),
	// but guard anyway since searchProfiles needs a role to pick an endpoint.
	const callerRole = user?.role === "artist" || user?.role === "hirer" ? user.role : null;

	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed === "" || callerRole === null) return;
		let cancelled = false;
		const timer = window.setTimeout(() => {
			searchProfiles(trimmed, callerRole)
				.then((matches) => {
					if (cancelled) return;
					setResults(matches.slice(0, MAX_RESULTS));
					setIsOpen(true);
				})
				.catch((err: unknown) => {
					console.error("Failed to search profiles:", err);
				});
		}, DEBOUNCE_MS);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [query, callerRole]);

	useEffect(() => {
		if (!isOpen) return;
		function handlePointerDown(e: PointerEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setIsOpen(false);
		}
		document.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	function handleSelect(userId: string) {
		setSelectedUserId(userId);
		setIsOpen(false);
		onSelect?.();
	}

	return (
		<div ref={containerRef} className={`relative ${className ?? ""}`}>
			<label className="input w-full rounded-full">
				<SearchIcon className="size-4 opacity-50" aria-hidden="true" />
				<input
					type="search"
					placeholder={placeholder}
					aria-label={placeholder}
					value={query}
					onChange={(e) => handleQueryChange(e.target.value)}
					onFocus={() => results.length > 0 && setIsOpen(true)}
				/>
			</label>

			{isOpen && results.length > 0 && (
				<ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-box border border-base-content/10 bg-base-100 py-1 shadow-lg">
					{results.map((result) => (
						<li key={result.userId}>
							<button
								type="button"
								onClick={() => handleSelect(result.userId)}
								className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-base-200"
							>
								<span className="truncate font-medium">{result.username}</span>
								<span
									className={`badge badge-sm shrink-0 font-medium ${
										result.role === "artist" ? "badge-primary" : "badge-secondary"
									}`}
								>
									{result.role === "artist" ? "Artist" : "Hirer"}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}

			<ProfileResultModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
		</div>
	);
}
