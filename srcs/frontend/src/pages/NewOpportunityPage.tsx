import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2 } from "lucide-react";
import { flattenError } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { opportunitySchema } from "../features/opportunities/schemas";
import { createGig } from "../features/gigs/api";
import { useToast } from "../features/toast/hooks/useToast";
import { useCategories } from "../features/categories/hooks/useCategories";
import OpportunityCard from "../features/opportunities/components/OpportunityCard";
import { ApiError } from "../lib/apiClient";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
	const { user } = useAuth();
	const navigate = useNavigate();
	const toast = useToast();
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
			toast.success(t("gig.createdToast", { title: result.data.title }));
		} catch (error) {
			setFormError(error instanceof ApiError ? error.message : t("gig.publishFailed"));
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
				<h1 className="text-xl font-bold">{t("gig.published")}</h1>
				<p className="text-base-content/60">{t("gig.publishedHint", { title: values.title })}</p>
				<button
					type="button"
					className="btn btn-primary mt-2"
					onClick={() => navigate("/opportunities/mine")}
				>
					{t("gig.viewMyOpportunities")}
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
						aria-label={t("profile.goBack")}
					>
						<ArrowLeft className="size-4" />
					</button>
					<h1 className="truncate font-bold">
						{t("gig.newOpportunity")}
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
						{isSubmitting ? t("gig.publishing") : t("gig.publish")}
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
							{t("gig.basics")}
						</h2>

						<fieldset className="fieldset">
							<label className="label" htmlFor="opportunity-title">
								{t("gig.title")}
							</label>
							<input
								id="opportunity-title"
								type="text"
								name="title"
								className="input validator w-full"
								placeholder={t("gig.titlePlaceholder")}
								value={values.title}
								onChange={handleChange}
								aria-invalid={errors.title ? "true" : "false"}
							/>
							<p className={`validator-hint ${errors.title ? "" : "hidden"}`}>{errors.title}</p>
						</fieldset>

						<div className="flex flex-col gap-4 sm:flex-row">
							<fieldset className="fieldset flex-1">
								<label className="label" htmlFor="opportunity-category">
									{t("gig.category")}
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
										{isLoadingCategories ? t("gig.loadingCategories") : t("gig.selectCategory")}
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
									{t("gig.rate")}{" "}
									<span className="font-normal text-base-content/50">{t("gig.rateHint")}</span>
								</label>
								<input
									id="opportunity-rate"
									type="number"
									min={0}
									step={1}
									name="rate"
									className="input validator w-full"
									placeholder={t("gig.ratePlaceholder")}
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
							{t("gig.brief")}
						</h2>

						<fieldset className="fieldset">
							<label className="label" htmlFor="opportunity-description">
								{t("gig.description")}{" "}
								<span className="font-normal text-base-content/50">{t("gig.optional")}</span>
							</label>
							<textarea
								id="opportunity-description"
								name="description"
								className="textarea validator w-full"
								rows={4}
								placeholder={t("gig.descriptionPlaceholder")}
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
							{t("gig.location")}
						</h2>

						<fieldset className="fieldset sm:w-72">
							<label className="label" htmlFor="opportunity-location">
								{t("gig.location")}{" "}
								<span className="font-normal text-base-content/50">{t("gig.optional")}</span>
							</label>
							<input
								id="opportunity-location"
								type="text"
								name="location"
								className="input validator w-full"
								placeholder={t("gig.locationPlaceholder")}
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
						{t("gig.preview")}
					</p>
					<OpportunityCard
						hirerName={user?.username ?? ""}
						hirerAvatarUrl={user?.avatarUrl}
						title={values.title}
						description={values.description}
						location={values.location}
						remoteOk={false}
						duration={values.rate ? `€${values.rate}` : ""}
						tags={[]}
						isNew
						coverPhotoUrl={null}
					/>
					<p className="mt-3 text-xs text-base-content/40">{t("deck.previewHint")}</p>
				</aside>
			</div>
		</div>
	);
}
