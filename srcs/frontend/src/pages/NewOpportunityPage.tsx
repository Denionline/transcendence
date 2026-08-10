import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2 } from "lucide-react";
import { flattenError } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { opportunitySchema } from "../features/opportunities/schemas";
import { createGig } from "../features/gigs/api";
import { useCategories } from "../features/categories/hooks/useCategories";
import OpportunityCard from "../features/opportunities/components/OpportunityCard";
import { ApiError } from "../lib/apiClient";

interface FormValues {
	title: string;
	category: string;
	description: string;
	location: string;
	rate: string;
}

const INITIAL_VALUES: FormValues = {
	title: "",
	category: "",
	description: "",
	location: "",
	rate: "",
};

interface FieldErrors {
	title?: string;
	category?: string;
	description?: string;
	location?: string;
	rate?: string;
}

export default function NewOpportunityPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { categories, isLoading: isLoadingCategories } = useCategories();
	const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [published, setPublished] = useState(false);

	function handleChange(
		e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
	) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
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
				description: fieldErrors.description?.[0],
				location: fieldErrors.location?.[0],
				rate: fieldErrors.rate?.[0],
			});
			return;
		}

		setErrors({});
		setFormError(null);
		setIsSubmitting(true);
		try {
			await createGig({
				title: result.data.title,
				category: result.data.category,
				description: result.data.description.trim() || undefined,
				location: result.data.location.trim() || undefined,
				rate: result.data.rate === "" ? undefined : Number(result.data.rate),
			});
			setPublished(true);
		} catch (error) {
			setFormError(error instanceof ApiError ? error.message : "Failed to publish opportunity");
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
					onClick={() => navigate("/opportunities/mine")}
				>
					View my opportunities
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
							<label className="label" htmlFor="opportunity-title">
								Title
							</label>
							<input
								id="opportunity-title"
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
								<label className="label" htmlFor="opportunity-category">
									Category
								</label>
								<select
									id="opportunity-category"
									name="category"
									className="select validator w-full"
									value={values.category}
									onChange={handleChange}
									disabled={isLoadingCategories}
									aria-invalid={errors.category ? "true" : "false"}
								>
									<option value="" disabled>
										{isLoadingCategories ? "Loading categories…" : "Select category"}
									</option>
									{categories.map((category) => (
										<option key={category.slug} value={category.slug}>
											{category.label}
										</option>
									))}
								</select>
								<p className={`validator-hint ${errors.category ? "" : "hidden"}`}>
									{errors.category}
								</p>
							</fieldset>

							<fieldset className="fieldset flex-1">
								<label className="label" htmlFor="opportunity-rate">
									Rate <span className="font-normal text-base-content/50">· optional, €</span>
								</label>
								<input
									id="opportunity-rate"
									type="number"
									min={0}
									step={1}
									name="rate"
									className="input validator w-full"
									placeholder="e.g. 1200"
									value={values.rate}
									onChange={handleChange}
									aria-invalid={errors.rate ? "true" : "false"}
								/>
								<p className={`validator-hint ${errors.rate ? "" : "hidden"}`}>{errors.rate}</p>
							</fieldset>
						</div>
					</section>

					<section className="flex flex-col gap-4">
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							Brief
						</h2>

						<fieldset className="fieldset">
							<label className="label" htmlFor="opportunity-description">
								Description <span className="font-normal text-base-content/50">· optional</span>
							</label>
							<textarea
								id="opportunity-description"
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
					</section>

					<section className="flex flex-col gap-4">
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							Location
						</h2>

						<fieldset className="fieldset sm:w-72">
							<label className="label" htmlFor="opportunity-location">
								Location <span className="font-normal text-base-content/50">· optional</span>
							</label>
							<input
								id="opportunity-location"
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
						remoteOk={false}
						duration={values.rate ? `€${values.rate}` : ""}
						tags={[]}
						isNew
						coverPhotoUrl={null}
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
