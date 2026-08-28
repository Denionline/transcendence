import type { ReactNode } from "react";

interface LegalSectionProps {
	heading: string;
	children: ReactNode;
}

export default function LegalSection({ heading, children }: LegalSectionProps) {
	return (
		<section className="mt-8 first:mt-0">
			<h2 className="text-xl font-semibold text-base-content">{heading}</h2>
			<div className="mt-3 space-y-3">{children}</div>
		</section>
	);
}
