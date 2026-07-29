import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { flattenError } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { opportunitySchema } from "../features/opportunities/schemas";
import { createOpportunity } from "../features/opportunities/api";
import { COMMITMENTS, WORK_TYPES } from "../features/opportunities/constants";
import type { Commitment } from "../features/opportunities/types";
import OpportunityCard from "../features/opportunities/components/OpportunityCard";

interface FormValues {
	title: string;
	description: string;
	workTypes: string[];
	duration: string;
	commitment: Commitment;
	location: string;
}

const INITIAL_VALUES: FormValues = {
	title: "",
	description: "",
	workTypes: [],
	duration: "",
	commitment: "on-site",
	location: "",
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

export default function NewOpportunityPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [published, setPublished] = useState(false);

	function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	function toggleWorkType(type: string) {
		setValues((prev) => ({
			...prev,
			workTypes: prev.workTypes.includes(type)
				? prev.workTypes.filter((t) => t !== type)
				: [...prev.workTypes, type],
		}));
	}

	function handleCommitmentChange(commitment: Commitment) {
		setValues((prev) => ({ ...prev, commitment }));
	}

	function handlePostAnother() {
		setValues(INITIAL_VALUES);
		setErrors({});
		setFormError(null);
		setPublished(false);
	}

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) return;

		const result = opportunitySchema.safeParse(values);
		if (!result.success) {
			const fieldErrors = flattenError(result.error).fieldErrors;
			setErrors({
				title: fieldErrors.title?.[0],
				description: fieldErrors.description?.[0],
				workTypes: fieldErrors.workTypes?.[0],
				duration: fieldErrors.duration?.[0],
				location: fieldErrors.location?.[0],
			});
			return;
		}

		setErrors({});
		setFormError(null);
		setIsSubmitting(true);
		try {
			await createOpportunity(user.id, result.data);
			setPublished(true);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Failed to publish opportunity");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (published) {
		return (
			<div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
				<div className="rounded-full bg-primary/10 p-4 text-primary">
					<CheckCircle2 className="size-10" />
				</div>
				<h1 className="text-xl font-bold">Opportunity published</h1>
				<p className="text-base-content/60">
					Artists matching &ldquo;{values.title}&rdquo; will start seeing it in their feed.
				</p>
				<div className="mt-2 flex gap-3">
					<button type="button" className="btn" onClick={handlePostAnother}>
						Post another
					</button>
					<button type="button" className="btn btn-primary" onClick={() => navigate("/discover")}>
						Back to Discover
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-xl font-bold">Post a new opportunity</h1>
				<p className="text-sm text-base-content/60">
					Describe the work you need and we&apos;ll match it with the right artists.
				</p>
			</div>

			<div className="grid gap-8 lg:grid-cols-3">
				<form
					className="fieldset lg:col-span-2 flex flex-col gap-1"
					onSubmit={handleSubmit}
					noValidate
				>
					<fieldset className="fieldset">
						<label className="label">Title</label>
						<input
							type="text"
							name="title"
							className="input validator w-full"
							placeholder="e.g. Hand-painted mural for our terrace launch"
							value={values.title}
							onChange={handleChange}
							aria-invalid={errors.title ? "true" : "false"}
						/>
						<p className={`validator-hint ${errors.title ? "" : "hidden"}`}>{errors.title}</p>
					</fieldset>

					<fieldset className="fieldset">
						<label className="label">Description</label>
						<textarea
							name="description"
							className="textarea validator w-full"
							rows={4}
							placeholder="Describe the work, deliverables, and any references artists should know about."
							value={values.description}
							onChange={handleChange}
							aria-invalid={errors.description ? "true" : "false"}
						/>
						<p className={`validator-hint ${errors.description ? "" : "hidden"}`}>
							{errors.description}
						</p>
					</fieldset>

					<fieldset className="fieldset">
						<label className="label">Work type</label>
						<div className="flex flex-wrap gap-2">
							{WORK_TYPES.map((type) => {
								const active = values.workTypes.includes(type);
								return (
									<button
										key={type}
										type="button"
										onClick={() => toggleWorkType(type)}
										aria-pressed={active}
										className={`btn btn-sm rounded-full border-none ${
											active ? "btn-primary" : "bg-base-200 text-base-content/60"
										}`}
									>
										{type}
									</button>
								);
							})}
						</div>
						{errors.workTypes && <p className="mt-2 text-xs text-error">{errors.workTypes}</p>}
					</fieldset>

					<fieldset className="fieldset">
						<label className="label">Duration</label>
						<input
							type="text"
							name="duration"
							className="input validator w-full"
							placeholder="e.g. 2 wks, 1 month"
							value={values.duration}
							onChange={handleChange}
							aria-invalid={errors.duration ? "true" : "false"}
						/>
						<p className={`validator-hint ${errors.duration ? "" : "hidden"}`}>{errors.duration}</p>
					</fieldset>

					<fieldset className="fieldset">
						<label className="label">Commitment</label>
						<div className="flex gap-2">
							{COMMITMENTS.map(({ value, label }) => (
								<button
									key={value}
									type="button"
									onClick={() => handleCommitmentChange(value)}
									aria-pressed={values.commitment === value}
									className={`btn btn-sm flex-1 rounded-full border-none ${
										values.commitment === value ? "btn-primary" : "bg-base-200 text-base-content/60"
									}`}
								>
									{label}
								</button>
							))}
						</div>
					</fieldset>

					<fieldset className="fieldset">
						<label className="label">Location</label>
						<input
							type="text"
							name="location"
							className="input validator w-full"
							placeholder="e.g. Lisbon, or Remote"
							value={values.location}
							onChange={handleChange}
							aria-invalid={errors.location ? "true" : "false"}
						/>
						<p className={`validator-hint ${errors.location ? "" : "hidden"}`}>{errors.location}</p>
					</fieldset>

					{formError && <p className="mt-2 text-sm text-error">{formError}</p>}

					<button
						className="btn btn-primary mt-4 self-start rounded-full px-6"
						type="submit"
						disabled={isSubmitting}
					>
						{isSubmitting && <span className="loading loading-spinner loading-xs" />}
						{isSubmitting ? "Publishing…" : "Publish opportunity"}
					</button>
				</form>

				<aside className="h-fit lg:sticky lg:top-20">
					<p className="mb-2 text-xs tracking-wide text-base-content/50 uppercase">Live preview</p>
					<OpportunityCard
						hirerName={user?.username ?? ""}
						title={values.title}
						location={values.location}
						duration={values.duration}
						commitment={values.commitment}
						workTypes={values.workTypes}
					/>
				</aside>
			</div>
		</div>
	);
}
