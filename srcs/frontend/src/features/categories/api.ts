import { request } from "../auth/api";
import { apiRequest } from "../../lib/apiClient";
import type { CategoryDto, CategoryListResponse } from "./types";

export async function fetchCategories(): Promise<CategoryDto[]> {
	const response = (await request("/categories")) as CategoryListResponse;
	return response.items;
}

export interface CategoryInput {
	label: string;
	/** Optional — the server derives it from the label when omitted. */
	slug?: string;
}

export function createCategory(input: CategoryInput): Promise<CategoryDto> {
	return apiRequest<CategoryDto>("/categories", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updateCategory(id: string, input: Partial<CategoryInput>): Promise<CategoryDto> {
	return apiRequest<CategoryDto>(`/categories/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export function deleteCategory(id: string): Promise<null> {
	return apiRequest<null>(`/categories/${id}`, { method: "DELETE" });
}
