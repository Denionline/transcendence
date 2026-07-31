export interface GigListing {
	id: string;
	hirerName: string;
	verified?: boolean;
	location: string;
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
