import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

const PANEL_ID = "filters-panel";

interface FiltersPanelProps {
	open: boolean;
	actions?: ReactNode;
	children: ReactNode;
}

export default function FiltersPanel({ open, actions, children }: FiltersPanelProps) {
	return (
		<aside
			id={PANEL_ID}
			className={`hidden shrink-0 overflow-hidden transition-all duration-300 ease-in-out motion-reduce:transition-none lg:block ${
				open ? "visible w-56 opacity-100 lg:mr-8" : "invisible w-0 opacity-0"
			}`}
		>
			<div className="w-56">
				<div className="mb-4 flex items-center justify-between gap-2">
					<h2 className="text-sm font-semibold">Filters</h2>
					{actions}
				</div>

				<div className="flex flex-col gap-6 text-sm">{children}</div>
			</div>
		</aside>
	);
}

interface FiltersToggleProps {
	open: boolean;
	onToggle: () => void;
}

/**
 * Button that expands/collapses {@link FiltersPanel}. Lives in the page header
 * rather than inside the panel, so it stays reachable once the panel is gone.
 */
export function FiltersToggle({ open, onToggle }: FiltersToggleProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={open}
			aria-controls={PANEL_ID}
			className={`btn btn-sm hidden rounded-full font-normal lg:inline-flex ${
				open ? "btn-primary" : "btn-outline border-base-content/15 text-base-content/60"
			}`}
		>
			<SlidersHorizontalIcon className="size-4" aria-hidden="true" />
			Filters
		</button>
	);
}
