import { useTranslation } from "react-i18next";
import LegalSection from "./LegalSection";

interface LegalSectionItem {
	label?: string;
	text: string;
}

interface LegalSectionContent {
	heading: string;
	paragraphs?: string[];
	items?: LegalSectionItem[];
	closing?: string;
}

interface TranslatedLegalSectionProps {
	path: string;
}

/**
 * Renders one section of a legal page straight from the locale files.
 *
 * The two legal documents are the only place in the app where a "string" is a
 * multi-paragraph block with bullet lists, so they are stored as structured
 * objects rather than flat strings, and read back with `returnObjects`. Keeping
 * them in the locale files (instead of one component per language) means
 * `npm run check:i18n` covers them like everything else — it compares the shape,
 * so a language that drops a bullet or a whole section fails the build instead
 * of quietly serving a shorter policy.
 */
export default function TranslatedLegalSection({ path }: TranslatedLegalSectionProps) {
	const { t } = useTranslation();
	const section = t(path, { returnObjects: true }) as LegalSectionContent;

	return (
		<LegalSection heading={section.heading}>
			{section.paragraphs?.map((paragraph) => (
				<p key={paragraph}>{paragraph}</p>
			))}

			{section.items && (
				<ul className="list-disc space-y-1 pl-6">
					{section.items.map((item) => (
						<li key={item.text}>
							{item.label ? (
								<>
									<strong>{item.label}</strong> — {item.text}
								</>
							) : (
								item.text
							)}
						</li>
					))}
				</ul>
			)}

			{section.closing && <p>{section.closing}</p>}
		</LegalSection>
	);
}
