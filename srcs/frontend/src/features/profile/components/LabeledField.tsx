import type { ComponentType, ReactNode, SVGProps } from "react";

interface LabeledFieldProps {
	label: string;
	/** Rendered inset at the input's left edge — pair with an `pl-9` input/textarea. */
	icon?: ComponentType<SVGProps<SVGSVGElement>>;
	/** Small muted text on the label's right edge, e.g. "optional" or a character count. */
	hint?: ReactNode;
	className?: string;
	children: ReactNode;
}

/** Shared label + icon-adorned-field shell used across the profile edit forms,
 *  so "Location", "Rate", "Organization name" etc. all line up the same way. */
export default function LabeledField({
	label,
	icon: Icon,
	hint,
	className = "",
	children,
}: LabeledFieldProps) {
	return (
		<label className={`fieldset-label flex-col items-start gap-1 ${className}`}>
			<span className="flex w-full items-center justify-between gap-2 text-sm font-medium">
				<span>{label}</span>
				{hint && <span className="text-xs font-normal text-base-content/40">{hint}</span>}
			</span>
			<div className="relative w-full">
				{Icon && (
					<Icon
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/40"
						aria-hidden="true"
					/>
				)}
				{children}
			</div>
		</label>
	);
}
