import { type FormEvent, useState } from "react";
import { PaletteIcon } from "lucide-react";
import Modal from "../../../components/Modal";
import { CATEGORIES } from "../../opportunities/constants";

interface CategoryOnboardingModalProps {
	isSaving: boolean;
	error: string | null;
	onSubmit: (category: string) => void;
}

// No `onClose` to hand the shared Modal here — this step is mandatory (an
// artist account is unusable without a category, since it's what the swipe
// matching is keyed on), so there's deliberately no way to dismiss it short
// of submitting the form.
export default function CategoryOnboardingModal({
	isSaving,
	error,
	onSubmit,
}: CategoryOnboardingModalProps) {
	const [category, setCategory] = useState("");

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!category) return;
		onSubmit(category);
	}

	return (
		<Modal open onClose={() => {}} labelledBy="category-onboarding-title" dismissible={false}>
			<form className="flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
				<div className="flex items-center gap-2">
					<PaletteIcon className="size-5 text-primary" aria-hidden="true" />
					<h2 id="category-onboarding-title" className="text-lg font-semibold">
						What&rsquo;s your discipline?
					</h2>
				</div>
				<p className="text-sm text-base-content/60">
					Pick the category that best describes your work. It&rsquo;s how we match you with
					opportunities — you&rsquo;ll need one to start browsing gigs.
				</p>

				{error && (
					<div className="alert alert-error">
						<span>{error}</span>
					</div>
				)}

				<label className="fieldset-label flex-col items-start gap-1">
					<span className="text-sm font-medium">Category</span>
					<select
						className="select w-full"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						required
						autoFocus
					>
						<option value="" disabled>
							Select category
						</option>
						{CATEGORIES.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</label>

				<button
					type="submit"
					className="btn btn-primary rounded-full"
					disabled={!category || isSaving}
				>
					{isSaving && <span className="loading loading-spinner loading-xs" />}
					Continue
				</button>
			</form>
		</Modal>
	);
}
