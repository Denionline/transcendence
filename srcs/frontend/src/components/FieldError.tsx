//	One place that decides what a field-level error looks like, so a form adds
//	validation by rendering this rather than by inventing its own markup.
export default function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p className="text-error text-xs" role="alert">
			{message}
		</p>
	);
}
