import {
	CATALOG_FILTER_PARAM,
	DEFAULT_CATALOG_PAGE,
	DEFAULT_CATALOG_PER_PAGE,
	DEFAULT_CATALOG_SORT,
	encodeCatalogFilter,
} from "@/lib/catalog/query";

import type { CatalogQuery } from "@/types/catalog";

function withoutEmptyValues(query: CatalogQuery): CatalogQuery {
	return {
		...query,
		search: query.search?.trim() || undefined,
		brand: query.brand?.filter(Boolean),
		filters: Object.fromEntries(
			Object.entries(query.filters ?? {})
				.map(([key, values]) => [key, values.filter(Boolean)])
				.filter(([, values]) => values.length > 0),
		),
	};
}

export function createCatalogHref(
	basePath: string,
	query: CatalogQuery = {},
): string {
	const cleanQuery = withoutEmptyValues(query);
	const params = new URLSearchParams();

	if (cleanQuery.search) {
		params.set("q", cleanQuery.search);
	}

	if (cleanQuery.sort && cleanQuery.sort !== DEFAULT_CATALOG_SORT) {
		params.set("sort", cleanQuery.sort);
	}

	if (cleanQuery.page && cleanQuery.page !== DEFAULT_CATALOG_PAGE) {
		params.set("page", String(cleanQuery.page));
	}

	if (
		cleanQuery.perPage &&
		cleanQuery.perPage !== DEFAULT_CATALOG_PER_PAGE
	) {
		params.set("perPage", String(cleanQuery.perPage));
	}

	cleanQuery.brand?.forEach((brand) => {
		params.append("brand", brand);
	});

	Object.entries(cleanQuery.filters ?? {}).forEach(([key, values]) => {
		values.forEach((value) => {
			params.append(CATALOG_FILTER_PARAM, encodeCatalogFilter(key, value));
		});
	});

	const queryString = params.toString();

	return queryString ? `${basePath}?${queryString}` : basePath;
}
