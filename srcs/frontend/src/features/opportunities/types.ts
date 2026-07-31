export interface Opportunity {
	id: string;
	hirerId: string;
	title: string;
	category: string;
	duration: string;
	description: string;
	applicationsClose: string;
	location: string;
	remoteOk: boolean;
	tags: string[];
	createdAt: string;
}
