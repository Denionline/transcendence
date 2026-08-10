import type { CategoryDto } from "../categories/types";

export interface ProfileDto {
	id: string;
	userId: string;
	kind: "artist" | "hirer";
	categories: CategoryDto[];
	bio: string | null;
	location: string | null;
	rate?: number | null;
	organizationName?: string;
	availability: boolean;
	createdAt: string;
	user?: {
		id: string;
		username: string;
		avatarUrl: string | null;
	};
}

export interface PaginatedResponse<T> {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
}
