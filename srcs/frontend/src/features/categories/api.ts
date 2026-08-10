import { request } from "../auth/api";
import type { CategoryDto, CategoryListResponse } from "./types";

export async function fetchCategories(): Promise<CategoryDto[]> {
	const response = (await request("/categories")) as CategoryListResponse;
	return response.items;
}
