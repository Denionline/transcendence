import { Link } from "react-router-dom";

export default function LegalFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t border-base-content/10 px-4 py-6 text-sm text-base-content/60 sm:px-6">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
				<p>© {year} Artmate</p>
				<nav aria-label="Legal" className="flex items-center gap-4">
					<Link to="/privacy" className="transition-colors hover:text-base-content">
						Privacy Policy
					</Link>
					<Link to="/terms" className="transition-colors hover:text-base-content">
						Terms of Service
					</Link>
				</nav>
			</div>
		</footer>
	);
}