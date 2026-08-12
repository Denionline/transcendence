import { type FormEvent, useState } from "react";
import { PaletteIcon } from "lucide-react";
import Modal from "../../../components/Modal";
import { useCategories } from "../../categories/hooks/useCategories";
import type { UserRole } from "../../auth/types";

export interface ProfileOnboardingValues {
	category: string;
	organizationName: string;
	bio: string;
	location: string;
	rate: string;
	availability: boolean;
}

interface ProfileOnboardingModalProps {
	role: Extract<UserRole, "artist" | "hirer">;
	isSaving: boolean;
	error: string | null;
	onSubmit: (values: ProfileOnboardingValues) => void;
}

// No `onClose` handed to the shared Modal here — this step is mandatory (the
// account is unusable without a category: it's what swipe matching, on
// either side, is keyed on), so there's deliberately no way to dismiss it
// short of submitting the form. Everything past category/organization name
// is optional here on purpose — same fields as Settings → Profile, just
// fillable later instead of blocking onboarding on them.
export default function ProfileOnboardingModal({
	role,
	isSaving,
	error,
	onSubmit,
}: ProfileOnboardingModalProps) {
	const { categories } = useCategories();
	const [category, setCategory] = useState("");
	const [organizationName, setOrganizationName] = useState("");
	const [bio, setBio] = useState("");
	const [location, setLocation] = useState("");
	const [rate, setRate] = useState("");
	const [availability, setAvailability] = useState(true);

	const isHirer = role === "hirer";
	// A hirer profile can't be created without an organization name either —
	// the backend rejects the first save without one, so it has to be
	// required here too, not just category.
	const canSubmit = category !== "" && (!isHirer || organizationName.trim() !== "");

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		onSubmit({ category, organizationName, bio, location, rate, availability });
	}

	return (
		<Modal open onClose={() => {}} labelledBy="profile-onboarding-title" dismissible={false}>
			<form className="flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
				<div className="flex items-center gap-2">
					<PaletteIcon className="size-5 text-primary" aria-hidden="true" />
					<h2 id="profile-onboarding-title" className="text-lg font-semibold">
						Set up your {isHirer ? "hirer" : "artist"} profile
					</h2>
				</div>
				<p className="text-sm text-base-content/60">
					{isHirer
						? "Category and organization name are required to get started — everything else below is optional and can be filled in anytime from Settings."
						: "Category is required to get started — it's how we match you with opportunities. Everything else below is optional and can be filled in anytime from Settings."}
				</p>

				{error && (
					<div className="alert alert-error">
						<span>{error}</span>
					</div>
				)}

				<label className="fieldset-label flex-col items-start gap-1">
					<span className="text-sm font-medium">
						Category<span className="text-error">*</span>
					</span>
					<select
						className="select w-full"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						required
					>
						<option value="" disabled>
							Select category
						</option>
						{categories.map((option) => (
							<option key={option.slug} value={option.slug}>
								{option.label}
							</option>
						))}
					</select>
				</label>

				{isHirer && (
					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">
							Organization name<span className="text-error">*</span>
						</span>
						<input
							type="text"
							className="input w-full"
							value={organizationName}
							onChange={(e) => setOrganizationName(e.target.value)}
							required
						/>
					</label>
				)}

				<label className="fieldset-label flex-col items-start gap-1">
					<span className="text-sm font-medium">
						Bio <span className="font-normal text-base-content/40">(optional)</span>
					</span>
					<textarea
						className="textarea w-full"
						rows={2}
						value={bio}
						onChange={(e) => setBio(e.target.value)}
					/>
				</label>

				<label className="fieldset-label flex-col items-start gap-1">
					<span className="text-sm font-medium">
						Location <span className="font-normal text-base-content/40">(optional)</span>
					</span>
					<input
						type="text"
						className="input w-full"
						value={location}
						onChange={(e) => setLocation(e.target.value)}
					/>
				</label>

				{!isHirer && (
					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">
							Rate <span className="font-normal text-base-content/40">(optional)</span>
						</span>
						<input
							type="number"
							min={0}
							step={1}
							className="input w-full"
							value={rate}
							onChange={(e) => setRate(e.target.value)}
						/>
					</label>
				)}

				{!isHirer && (
					<label className="fieldset-label flex items-center gap-2">
						<input
							type="checkbox"
							className="toggle"
							checked={availability}
							onChange={(e) => setAvailability(e.target.checked)}
						/>
						<span className="text-sm font-medium">Available for work</span>
					</label>
				)}

				<button
					type="submit"
					className="btn btn-primary rounded-full"
					disabled={!canSubmit || isSaving}
				>
					{isSaving && <span className="loading loading-spinner loading-xs" />}
					Continue
				</button>
			</form>
		</Modal>
	);
}
