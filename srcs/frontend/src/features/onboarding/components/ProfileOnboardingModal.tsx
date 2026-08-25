import { type FormEvent, useState } from "react";
import { PaletteIcon } from "lucide-react";
import Modal from "../../../components/Modal";
import { useCategories } from "../../categories/hooks/useCategories";
import type { UserRole } from "../../auth/types";
import FieldError from "../../../components/FieldError";
import { validateForm, type FieldErrors } from "../../../lib/formValidation";
import { LIMITS } from "../../../lib/limits";
import {
	MAX_BIO_LENGTH,
	artistOnboardingSchema,
	hirerOnboardingSchema,
	type ArtistOnboardingValues,
	type HirerOnboardingValues,
} from "../../profile/schemas";

export interface ProfileOnboardingValues {
	category: string;
	organizationName: string;
	bio: string;
	location: string;
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
	const [availability, setAvailability] = useState(true);
	//	One bag of messages for both shapes: the form renders whichever of
	//	category/organizationName its role asks for, never both.
	const [errors, setErrors] = useState<FieldErrors<ArtistOnboardingValues & HirerOnboardingValues>>(
		{},
	);

	const isHirer = role === "hirer";
	// Hirers don't pick a category at all — matching runs on each gig's own
	// category (set when the gig is posted), not on the hirer's profile — so
	// only their organization name is required. Artists still need a category:
	// it's what swipe matching keys on for them.
	const canSubmit = isHirer ? organizationName.trim() !== "" : category !== "";

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!canSubmit) return;

		//	canSubmit covers the one field that must be *there*; the schema
		//	covers what it and the optional ones may contain.
		const values = { category, organizationName, bio, location, availability };
		const checked = isHirer
			? validateForm(hirerOnboardingSchema, values)
			: validateForm(artistOnboardingSchema, values);
		if (!checked.ok) {
			setErrors(checked.errors);
			return;
		}

		setErrors({});
		onSubmit({ ...values, ...checked.data });
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
						? "Organization name is required to get started — everything else below is optional and can be filled in anytime from Settings."
						: "Category is required to get started — it's how we match you with opportunities. Everything else below is optional and can be filled in anytime from Settings."}
				</p>

				{error && (
					<div className="alert alert-error">
						<span>{error}</span>
					</div>
				)}

				{!isHirer && (
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
				)}

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
							maxLength={LIMITS.shortText}
							aria-invalid={errors.organizationName ? "true" : undefined}
						/>
						<FieldError message={errors.organizationName} />
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
						maxLength={MAX_BIO_LENGTH}
						aria-invalid={errors.bio ? "true" : undefined}
					/>
					<FieldError message={errors.bio} />
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
						maxLength={LIMITS.shortText}
						aria-invalid={errors.location ? "true" : undefined}
					/>
					<FieldError message={errors.location} />
				</label>

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
