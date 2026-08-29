import { useTranslation } from "react-i18next";
import LegalPageLayout from "../layouts/LegalPageLayout";
import TranslatedLegalSection from "../components/TranslatedLegalSection";

const LAST_UPDATED = "2026-08-28";

// Order matters — it's the reading order of the document.
const SECTIONS = [
	"collect",
	"use",
	"visibility",
	"protect",
	"retention",
	"rights",
	"children",
	"changes",
	"contact",
];

export default function PrivacyPolicyPage() {
	const { t } = useTranslation();

	return (
		<LegalPageLayout title={t("legal.privacy.title")} lastUpdated={LAST_UPDATED}>
			<p>{t("legal.privacy.intro")}</p>

			{SECTIONS.map((section) => (
				<TranslatedLegalSection key={section} path={`legal.privacy.sections.${section}`} />
			))}
		</LegalPageLayout>
	);
}
