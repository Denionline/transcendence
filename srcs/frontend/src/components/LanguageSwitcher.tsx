import { useTranslation } from "react-i18next";
import { LanguagesIcon } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../i18n";

/**
 * Language picker. Changing the selection calls i18n.changeLanguage, which
 * re-renders every component using useTranslation and persists the choice to
 * localStorage via the detector's cache — so it survives a reload.
 *
 * Rendered as a native <select> rather than a custom dropdown: it is keyboard-
 * and screen-reader-accessible for free, and on mobile it opens the OS picker.
 */
export default function LanguageSwitcher() {
	const { t, i18n } = useTranslation();

	// i18n.language can carry a region (e.g. "pt-BR") even though only "pt" is
	// loaded, which would leave the <select> with no matching option and show
	// blank. resolvedLanguage is what i18next actually settled on.
	const current = i18n.resolvedLanguage ?? "en";

	return (
		<label className="flex items-center gap-1 text-base-content/60">
			<LanguagesIcon className="size-4" aria-hidden="true" />
			<span className="sr-only">{t("common.language")}</span>
			<select
				value={current}
				onChange={(e) => void i18n.changeLanguage(e.target.value)}
				aria-label={t("common.language")}
				className="select select-ghost select-xs w-auto border-none bg-transparent font-medium focus:outline-none"
			>
				{SUPPORTED_LANGUAGES.map((language) => (
					<option key={language.code} value={language.code}>
						{language.label}
					</option>
				))}
			</select>
		</label>
	);
}