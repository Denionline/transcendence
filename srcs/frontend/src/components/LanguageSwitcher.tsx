import { useTranslation } from "react-i18next";
import { LanguagesIcon } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../i18n";


export default function LanguageSwitcher() {
	const { t, i18n } = useTranslation();

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