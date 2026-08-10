/** One row of the server-owned vocabulary served by GET /api/categories. */
export interface CategoryDto {
	id: string;
	/** Normalized matching key, e.g. "street-artist". Stable across renames. */
	slug: string;
	/** Display string, e.g. "Street artist". */
	label: string;
}

export interface CategoryListResponse {
	items: CategoryDto[];
}
