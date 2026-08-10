import type { CategoryDto } from "../categories/types";

export interface GigDto {
	id: string;
	hirerId: string;
	title: string;
	description: string | null;
	categoryId: string;
	category: CategoryDto;
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

export interface CreateGigInput {
	title: string;
	/** A category slug or label; the server resolves it to a Category row. */
	category: string;
	description?: string;
	location?: string;
	rate?: number;
}
