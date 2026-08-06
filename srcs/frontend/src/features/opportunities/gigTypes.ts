export interface GigListing {
	id: string;
	hirerName: string;
	verified?: boolean;
	category: string;
	location: string;
	/** Raw rate for filtering; `budget` below is the formatted display string. */
	rate: number | null;
	remoteOk: boolean;
	postedLabel: string;
	isNew?: boolean;
	title: string;
	description: string;
	budget: string;
	duration: string;
	tags: string[];
	coverPhotoUrl?: string | null;
}
