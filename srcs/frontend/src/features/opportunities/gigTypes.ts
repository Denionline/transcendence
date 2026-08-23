export interface GigListing {
	id: string;
	hirerName: string;
	hirerAvatarUrl?: string | null;
	verified?: boolean;
	/** Matching key for the discipline filter. */
	category: string;
	/** Display label for the same category — shown as a badge, highlighted when the filter selects it. */
	categoryLabel: string;
	location: string;
	rate: number | null;
	remoteOk: boolean;
	postedLabel: string;
	isNew?: boolean;
	title: string;
	description: string;
	duration: string;
	tags: string[];
	coverPhotoUrl?: string | null;
}
