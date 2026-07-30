import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, CircleCheck, Plus } from "lucide-react";
import { flattenError } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { opportunitySchema } from "../features/opportunities/schemas";
import { createOpportunity } from "../features/opportunities/api";
import { CATEGORIES, DURATION_PRESETS, MAX_TAGS, TAGS } from "../features/opportunities/constants";
import OpportunityCard from "../features/opportunities/components/OpportunityCard";

const DRAFT_KEY = "artmate_opportunity_draft";

interface FormValues {
	title: string;
	category: string;
	duration: string;
	description: string;
	applicationsClose: string;
	location: string;
	remoteOk: boolean;
	tags: string[];
}

const INITIAL_VALUES: FormValues = {
	title: "",
	category: "",
	duration: "",
	description: "",
	applicationsClose: "",
	location: "",
	remoteOk: false,
	tags: [],
};

interface FieldErrors {
	title?: string;
	category?: string;
	duration?: string;
	description?: string;
	applicationsClose?: string;
	location?: string;
	tags?: string;
}

export default function NewOpportunityPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [published, setPublished] = useState(false);
	const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
	const [draftSaved, setDraftSaved] = useState(false);

	useEffect(() => {
		return () => {
			if (coverPhotoUrl) URL.revokeObjectURL(coverPhotoUrl);
		};
	}, [coverPhotoUrl]);

	function handleChange(
		e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
	) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	function toggleTag(tag: string) {
		setValues((prev) => {
			const active = prev.tags.includes(tag);
			if (!active && prev.tags.length >= MAX_TAGS) return prev;
			return {
				...prev,
				tags: active ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
			};
		});
	}

	function toggleRemoteOk() {
		setValues((prev) => ({ ...prev, remoteOk: !prev.remoteOk }));
	}

	function handleCoverPhotoChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setCoverPhotoUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return URL.createObjectURL(file);
		});
	}

	function handleSaveDraft() {
		localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
		setDraftSaved(true);
		setTimeout(() => setDraftSaved(false), 2000);
	}

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) return;

		const result = opportunitySchema.safeParse(values);
		if (!result.success) {
			const fieldErrors = flattenError(result.error).fieldErrors;
			setErrors({
				title: fieldErrors.title?.[0],
				category: fieldErrors.category?.[0],
				duration: fieldErrors.duration?.[0],
				description: fieldErrors.description?.[0],
				applicationsClose: fieldErrors.applicationsClose?.[0],
				location: fieldErrors.location?.[0],
				tags: fieldErrors.tags?.[0],
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
				<button
					type="button"
					className="btn btn-primary mt-2"
					onClick={() => navigate("/discover")}
				>
					Back to Discover
				</button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-base-100">
			<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-base-content/10 bg-base-100 px-4 py-3 sm:px-6">
				<div className="flex min-w-0 items-center gap-3">
					<button
						type="button"
						onClick={() => navigate(-1)}
						className="btn btn-ghost btn-circle btn-sm"
						aria-label="Go back"
					>
						<ArrowLeft className="size-4" />
					</button>
					<h1 className="truncate font-bold">
						New opportunity
						<span className="ml-2 truncate text-sm font-normal text-base-content/50">
							· posting as {user?.username}
						</span>
					</h1>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{draftSaved && <span className="text-xs text-success">Draft saved</span>}
					<button type="button" className="btn btn-sm rounded-full" onClick={handleSaveDraft}>
						Save draft
					</button>
					<button
						type="submit"
						form="new-opportunity-form"
						className="btn btn-primary btn-sm rounded-full"
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<span className="loading loading-spinner loading-xs" />
						) : (
							<Check className="size-4" />
						)}
						{isSubmitting ? "Publishing…" : "Publish opportunity"}
					</button>
				</div>
			</header>

			<div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-3">
				<form
					id="new-opportunity-form"
					className="flex flex-col gap-8 lg:col-span-2"
					onSubmit={handleSubmit}
					noValidate
				>
					<section className="flex flex-col gap-4">
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							Basics
						</h2>

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

						<div className="flex flex-col gap-4 sm:flex-row">
							<fieldset className="fieldset flex-1">
								<label className="label">Category</label>
								<select
									name="category"
									className="select validator w-full"
									value={values.category}
									onChange={handleChange}
									aria-invalid={errors.category ? "true" : "false"}
								>
									<option value="" disabled>
										Select category
									</option>
									{CATEGORIES.map((category) => (
										<option key={category} value={category}>
											{category}
										</option>
									))}
								</select>
								<p className={`validator-hint ${errors.category ? "" : "hidden"}`}>
									{errors.category}
								</p>
							</fieldset>

							<fieldset className="fieldset flex-1">
								<label className="label">Duration</label>
								<select
									name="duration"
									className="select validator w-full"
									value={values.duration}
									onChange={handleChange}
									aria-invalid={errors.duration ? "true" : "false"}
								>
									<option value="" disabled>
										Select duration
									</option>
									{DURATION_PRESETS.map((duration) => (
										<option key={duration} value={duration}>
											{duration}
										</option>
									))}
								</select>
								<p className={`validator-hint ${errors.duration ? "" : "hidden"}`}>
									{errors.duration}
								</p>
							</fieldset>
						</div>
					</section>

					<section className="flex flex-col gap-4">
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							Brief
						</h2>

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

						<label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/20 py-10 text-center transition-colors hover:border-base-content/40">
							<input
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleCoverPhotoChange}
							/>
							<Plus className="size-5 text-base-content/40" />
							<span className="text-xs tracking-wide text-base-content/40 uppercase">
								{coverPhotoUrl ? "Change cover photo" : "Add cover photo — venue or brand shot"}
							</span>
						</label>
					</section>

					<section className="flex flex-col gap-4">
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							Timeline
						</h2>

						<fieldset className="fieldset sm:w-56">
							<label className="label">Applications close</label>
							<input
								type="date"
								name="applicationsClose"
								className="input validator w-full"
								value={values.applicationsClose}
								onChange={handleChange}
								aria-invalid={errors.applicationsClose ? "true" : "false"}
							/>
							<p className={`validator-hint ${errors.applicationsClose ? "" : "hidden"}`}>
								{errors.applicationsClose}
							</p>
						</fieldset>
					</section>

					<section className="flex flex-col gap-4">
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							Location &amp; tags
						</h2>

						<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<fieldset className="fieldset flex-1">
								<label className="label">Location</label>
								<input
									type="text"
									name="location"
									className="input validator w-full"
									placeholder="e.g. Lisbon"
									value={values.location}
									onChange={handleChange}
									aria-invalid={errors.location ? "true" : "false"}
								/>
								<p className={`validator-hint ${errors.location ? "" : "hidden"}`}>
									{errors.location}
								</p>
							</fieldset>

							<button
								type="button"
								onClick={toggleRemoteOk}
								aria-pressed={values.remoteOk}
								className={`btn btn-sm gap-2 rounded-full border-none ${
									values.remoteOk ? "btn-primary" : "bg-base-200 text-base-content/60"
								}`}
							>
								<CircleCheck className="size-4" />
								Remote OK
							</button>
						</div>

						<fieldset className="fieldset">
							<label className="label">
								Tags{" "}
								<span className="font-normal text-base-content/50">· pick up to {MAX_TAGS}</span>
							</label>
							<div className="flex flex-wrap gap-2">
								{TAGS.map((tag) => {
									const active = values.tags.includes(tag);
									const disabled = !active && values.tags.length >= MAX_TAGS;
									return (
										<button
											key={tag}
											type="button"
											disabled={disabled}
											onClick={() => toggleTag(tag)}
											aria-pressed={active}
											className={`btn btn-sm rounded-full border-none disabled:opacity-40 ${
												active ? "btn-primary" : "bg-base-200 text-base-content/60"
											}`}
										>
											{tag}
										</button>
									);
								})}
							</div>
							{errors.tags && <p className="mt-2 text-xs text-error">{errors.tags}</p>}
						</fieldset>
					</section>

					{formError && <p className="text-sm text-error">{formError}</p>}
				</form>

				<aside className="h-fit lg:sticky lg:top-20">
					<p className="mb-2 text-xs tracking-wide text-base-content/50 uppercase">
						Preview · how artists see it
					</p>
					<OpportunityCard
						hirerName={user?.username ?? ""}
						title={values.title}
						description={values.description}
						location={values.location}
						remoteOk={values.remoteOk}
						duration={values.duration}
						tags={values.tags}
						isNew
						coverPhotoUrl={coverPhotoUrl}
					/>
					<p className="mt-3 text-xs text-base-content/40">
						This is exactly how artists will see it in their feed — fill in the form and watch it
						update here.
					</p>
				</aside>
			</div>
		</div>
	);
}
