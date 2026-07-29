export type Commitment = "on-site" | "remote" | "hybrid";

export interface Opportunity {
	id: string;
	hirerId: string;
	title: string;
	description: string;
	workTypes: string[];
	duration: string;
	commitment: Commitment;
	location: string;
	createdAt: string;
}
