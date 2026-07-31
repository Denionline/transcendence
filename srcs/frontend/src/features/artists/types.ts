export interface Artist {
	id: string;
	name: string;
	discipline: string;
	location: string;
	remoteOk: boolean;
	availabilityLabel: string;
	availabilityTone: "available" | "soon";
	priceTier: string;
	tags: string[];
	verified?: boolean;
	photoUrl?: string | null;
}
