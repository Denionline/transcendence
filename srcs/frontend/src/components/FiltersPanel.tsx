import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";
import Modal from "./Modal";
import { useMediaQuery } from "../lib/useMediaQuery";

const PANEL_ID = "filters-panel";
const DESKTOP_QUERY = "(min-width: 1024px)";

interface FiltersPanelProps {
	open: boolean;
	/**
	 * Only used on mobile, where the panel is a dismissible modal instead of
	 * an in-flow sidebar — Escape/backdrop-click/the modal's own close button
	 * all need somewhere to send "closed" back to.
	 */
	onClose: () => void;
	actions?: ReactNode;
	children: ReactNode;
}

/**
 * Same filters, two different presentations depending on viewport: a
 * collapsible in-flow sidebar on desktop (there's room for it beside the
 * deck), and a dismissible modal on mobile (there isn't — a permanent
 * sidebar would eat the whole screen). Both share the same `open` state and
 * the same {@link FiltersToggle} button to drive it.
 */
export default function FiltersPanel({ open, onClose, actions, children }: FiltersPanelProps) {
	const isDesktop = useMediaQuery(DESKTOP_QUERY);

	if (!isDesktop) {
		return (
			<Modal open={open} onClose={onClose} labelledBy="filters-panel-title">
				<div className="flex flex-col gap-6 p-6 text-sm">
					<h2 id="filters-panel-title" className="text-base font-semibold">
						Filters
					</h2>
					{children}
					{actions && <div className="flex justify-end">{actions}</div>}
				</div>
			</Modal>
		);
	}

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
 * Button that opens/closes {@link FiltersPanel} — expand/collapse on
 * desktop, show/hide the modal on mobile. Lives in the page header rather
 * than inside the panel, so it stays reachable once the panel is gone
 * (that's every mobile render, and desktop whenever it's collapsed).
 */
export function FiltersToggle({ open, onToggle }: FiltersToggleProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={open}
			aria-controls={PANEL_ID}
			className={`btn btn-sm rounded-full font-normal ${
				open ? "btn-primary" : "btn-outline border-base-content/15 text-base-content/60"
			}`}
		>
			<SlidersHorizontalIcon className="size-4" aria-hidden="true" />
			Filters
		</button>
	);
}
