import { CheckIcon, SparklesIcon } from "lucide-react";
import Modal from "../../../components/Modal";
import { useTheme } from "../../theme/hooks/useTheme";
import { THEMES } from "../../theme/constants";

interface ThemeOnboardingModalProps {
	/** Fires on every way out — pick a theme and continue, skip, the X, backdrop, or Escape. */
	onDone: () => void;
}

// Optional, unlike CategoryOnboardingModal: every path out (skip, X, backdrop,
// Escape) routes through `onDone`, which is what actually records that this
// artist has seen the prompt — dismissing it any way still means "don't ask
// again", not just closing the dialog.
export default function ThemeOnboardingModal({ onDone }: ThemeOnboardingModalProps) {
	const { theme, setTheme } = useTheme();

	return (
		<Modal open onClose={onDone} labelledBy="theme-onboarding-title">
			<div className="flex flex-col gap-4 p-6">
				<div className="flex items-center gap-2">
					<SparklesIcon className="size-5 text-primary" aria-hidden="true" />
					<h2 id="theme-onboarding-title" className="text-lg font-semibold">
						Pick a theme
					</h2>
				</div>
				<p className="text-sm text-base-content/60">
					Totally optional — changes apply instantly and you can always switch it later in Settings.
				</p>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{THEMES.map(({ value, label }) => {
						const isActive = theme === value;
						return (
							<button
								key={value}
								type="button"
								onClick={() => setTheme(value)}
								aria-pressed={isActive}
								className={`relative overflow-hidden rounded-box border p-3 text-left transition-colors ${
									isActive
										? "border-primary ring-2 ring-primary"
										: "border-base-content/10 hover:border-base-content/30"
								}`}
								data-theme={value}
							>
								{isActive && (
									<span className="absolute top-2 right-2 rounded-full bg-primary p-0.5 text-primary-content">
										<CheckIcon className="size-3" />
									</span>
								)}
								<div className="mb-2 flex gap-1.5 rounded-box bg-base-100 p-2">
									<span className="size-4 rounded-full bg-primary" />
									<span className="size-4 rounded-full bg-secondary" />
									<span className="size-4 rounded-full bg-accent" />
									<span className="size-4 rounded-full bg-neutral" />
								</div>
								<span className="text-sm font-medium text-base-content">{label}</span>
							</button>
						);
					})}
				</div>

				<div className="flex items-center justify-end gap-2 pt-2">
					<button type="button" onClick={onDone} className="btn btn-ghost btn-sm rounded-full">
						Maybe later
					</button>
					<button type="button" onClick={onDone} className="btn btn-primary btn-sm rounded-full">
						Continue
					</button>
				</div>
			</div>
		</Modal>
	);
}
