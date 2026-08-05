export interface GigDto {
	id: string;
	hirerId: string;
	title: string;
	description: string | null;
	category: string;
	location: string | null;
	rate: number | null;
	status: "open" | "closed";
	createdAt: string;
	hirer?: {
		username: string;
		avatarUrl: string | null;
	} | null;
}

export interface GigListResponse {
	items: GigDto[];
	page: number;
	pageSize: number;
	total: number;
}
