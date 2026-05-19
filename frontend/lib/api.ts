import categoriesData from "@/data/mock/categories.json";

import type { Category } from "@/types";

export async function getCategories(): Promise<Category[]> {
	try {
		return categoriesData;
	} catch (error) {
		console.error("Failed to get categories", error);

		throw error;
	}
}