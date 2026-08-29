import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import Logo from "../components/Logo";
import LegalFooter from "../components/LegalFooter";
import { useTranslation } from "react-i18next";

interface LegalPageLayoutProps {
	title: string;
	/** ISO date (YYYY-MM-DD) shown as "Last updated". */
	lastUpdated: string;
	children: ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
	const { t } = useTranslation();
	const displayDate = new Date(lastUpdated).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="flex min-h-screen flex-col bg-base-100">
			<header className="border-b border-base-content/10 px-4 py-4 sm:px-6">
				<div className="mx-auto max-w-6xl">
					<Link to="/" aria-label={t("a11y.artmateHome")} className="inline-flex">
						<Logo />
					</Link>
				</div>
			</header>

			<main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
				<h1 className="text-3xl font-bold">{title}</h1>
				<p className="mt-2 text-sm text-base-content/50">
					Last updated: <time dateTime={lastUpdated}>{displayDate}</time>
				</p>

				{/* The project only has the daisyUI plugin, not Tailwind Typography,
				    so there is no `prose` class to lean on — the sections style their
				    own headings and text via the LegalSection helper instead. */}
				<div className="mt-8 leading-relaxed text-base-content/80">{children}</div>
			</main>

			<LegalFooter />
		</div>
	);
}
