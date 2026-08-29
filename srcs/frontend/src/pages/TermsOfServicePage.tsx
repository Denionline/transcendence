import { useTranslation } from "react-i18next";
import LegalPageLayout from "../layouts/LegalPageLayout";
import TranslatedLegalSection from "../components/TranslatedLegalSection";

const LAST_UPDATED = "2026-08-28";

// Order matters — it's the reading order of the document.
const SECTIONS = [
	"who",
	"account",
	"content",
	"acceptable",
	"matches",
	"availability",
	"liability",
	"changes",
	"contact",
];

export default function TermsOfServicePage() {
	const { t } = useTranslation();

	return (
		<LegalPageLayout title={t("legal.terms.title")} lastUpdated={LAST_UPDATED}>
			<p>{t("legal.terms.intro")}</p>

			{SECTIONS.map((section) => (
				<TranslatedLegalSection key={section} path={`legal.terms.sections.${section}`} />
			))}
		</LegalPageLayout>
	);
}