import { useState } from "react";
import {
	ArrowLeft,
	BellIcon,
	CheckIcon,
	LanguagesIcon,
	PaletteIcon,
	SlidersHorizontalIcon,
	UserRoundIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../features/theme/hooks/useTheme";
import { THEMES } from "../features/theme/constants";
import OpportunityCard from "../features/opportunities/components/OpportunityCard";
import AccountSection from "../features/profile/components/AccountSection";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";

type Section = "account" | "preferences" | "notifications" | "appearance" | "language";

// Labels are i18n keys, resolved at render: a module constant is evaluated
// once at import, so a translated string here would freeze in whatever
// language was active on first load.
const SECTIONS: { id: Section; labelKey: string; icon: typeof UserRoundIcon }[] = [
	{ id: "account", labelKey: "settings.account", icon: UserRoundIcon },
	// { id: "preferences", labelKey: "settings.preferences", icon: SlidersHorizontalIcon },
	// { id: "notifications", labelKey: "settings.notifications", icon: BellIcon },
	{ id: "appearance", labelKey: "settings.appearance", icon: PaletteIcon },
	{ id: "language", labelKey: "settings.language", icon: LanguagesIcon },
];

export default function SettingsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [activeSection, setActiveSection] = useState<Section>("account");

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
					<h1 className="truncate font-bold">{t("settings.title")}</h1>
				</div>
			</header>

			<div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
				<nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
					{SECTIONS.map(({ id, labelKey, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setActiveSection(id)}
							className={`flex shrink-0 items-center gap-2 rounded-box px-3 py-2 text-sm font-medium transition-colors lg:w-full ${
								activeSection === id
									? "bg-base-200 text-base-content"
									: "text-base-content/60 hover:bg-base-200/60 hover:text-base-content"
							}`}
						>
							<Icon className="size-4" />
							{t(labelKey)}
						</button>
					))}
				</nav>

				<div className="min-w-0">
					{activeSection === "account" && <AccountSection />}

					{activeSection === "preferences" && (
						<EmptySection
							icon={SlidersHorizontalIcon}
							title={t("settings.preferences")}
							description={t("settings.nothingToConfigure")}
						/>
					)}

					{activeSection === "notifications" && (
						<EmptySection
							icon={BellIcon}
							title={t("settings.notifications")}
							description={t("settings.notificationsSoon")}
						/>
					)}

					{activeSection === "appearance" && <AppearanceSection />}
					{activeSection === "language" && <LanguageSection />}
				</div>
			</div>
		</div>
	);
}

function EmptySection({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof UserRoundIcon;
	title: string;
	description: string;
}) {
	return (
		<section className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
			<div className="border-b border-base-content/10 p-4">
				<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
					{title}
				</h2>
			</div>
			<div className="flex flex-col items-center gap-2 p-10 text-center">
				<Icon className="size-6 text-base-content/30" />
				<p className="text-sm text-base-content/50">{description}</p>
			</div>
		</section>
	);
}

function LanguageSection() {
	const { t, i18n } = useTranslation();

	const current = i18n.resolvedLanguage ?? "en";

	return (
		<section className="flex flex-col gap-6">
			<div className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
				<div className="border-b border-base-content/10 p-4">
					<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
						{t("settings.language")}
					</h2>
					<p className="mt-1 text-sm text-base-content/60">{t("settings.languageHint")}</p>
				</div>

				<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
					{SUPPORTED_LANGUAGES.map(({ code, label }) => {
						const isActive = current === code;
						return (
							<button
								key={code}
								type="button"
								onClick={() => void i18n.changeLanguage(code)}
								aria-pressed={isActive}
								className={`flex items-center justify-between gap-2 rounded-box border p-3 text-left transition-colors ${
									isActive
										? "border-primary ring-2 ring-primary"
										: "border-base-content/10 hover:border-base-content/30"
								}`}
							>
								<span className="text-sm font-medium">{label}</span>
								{isActive && <CheckIcon className="size-4 shrink-0 text-primary" />}
							</button>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function AppearanceSection() {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();

	return (
		<section className="flex flex-col gap-6">
			<div className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
				<div className="border-b border-base-content/10 p-4">
					<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
						{t("settings.theme")}
					</h2>
					<p className="mt-1 text-sm text-base-content/60">{t("settings.themeHint")}</p>
				</div>

				<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
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
			</div>

			<div>
				<p className="mb-2 text-xs tracking-wide text-base-content/50 uppercase">
					{t("settings.livePreview")}
				</p>
				<div className="max-w-xs">
					<OpportunityCard
						hirerName="Casa Verde Café"
						title="Hand-painted mural for our terrace launch"
						description="Neighborhood café commissioning local artists for seasonal murals."
						location="Lisbon"
						remoteOk={false}
						duration="2 weeks"
						tags={["Mural", "Acrylic"]}
						isNew
						coverPhotoUrl={null}
					/>
				</div>
			</div>
		</section>
	);
}
