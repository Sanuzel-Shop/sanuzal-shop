import rawCatalogData from "@/data/catalog/products.json";
import {
	filterProducts,
	paginateProducts,
	sortProducts,
} from "@/lib/catalog/filters";
import { getProductPrimaryImage } from "@/lib/catalog/helpers";
import {
	DEFAULT_CATALOG_PAGE,
	DEFAULT_CATALOG_PER_PAGE,
	DEFAULT_CATALOG_SORT,
} from "@/lib/catalog/query";
import { isSameSlug, slugify } from "@/lib/utils/slug";

import type {
	CatalogQuery,
	CatalogResult,
	Category,
	CategoryKey,
	CategoryLink,
	Product,
} from "@/types/catalog";

type CatalogData = {
	schemaVersion: number;
	products: Product[];
};

const catalogData = rawCatalogData as CatalogData;
const products = catalogData.products;
const STRAPI_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

const MOCK_CATEGORY_FIXTURES = [
	{
		key: "toilets",
		slug: "unitazy",
		name: "Унитазы",
		englishName: "Toilets",
		description:
			"Подвесные и напольные модели Leppa с чистой геометрией, безободковой чашей и тихим смывом.",
		image: "/categories/unitazy.png",
		seo: {
			title: "Унитазы Leppa",
			description:
				"Каталог унитазов Leppa: напольные и подвесные модели для современных ванных комнат.",
		},
	},
	{
		key: "smart-toilets",
		slug: "umnye-unitazy",
		name: "Умные унитазы",
		englishName: "Smart Toilets",
		description:
			"Интеллектуальная сантехника WenSton и Leppa для проектов с повышенным уровнем комфорта.",
		image: "/categories/umnye-unitazy.png",
		seo: {
			title: "Умные унитазы WenSton",
			description:
				"Умные унитазы WenSton с продуманными функциями для современной ванной комнаты.",
		},
	},
	{
		key: "sinks",
		slug: "rakoviny",
		name: "Раковины",
		englishName: "Sinks",
		description:
			"Аккуратная керамика для современной ванной комнаты и проектных комплектаций.",
		image: "/categories/rakoviny.png",
		seo: {
			title: "Раковины Leppa",
			description:
				"Каталог раковин Leppa для частных интерьеров и комплектации проектов.",
		},
	},
	{
		key: "mirrors",
		slug: "zerkala",
		name: "Зеркала",
		englishName: "Mirrors",
		description:
			"LED-зеркала WenSton с антизапотеванием, сенсорным включением и тонкой рамой.",
		image: "/categories/zerkala.png",
		seo: {
			title: "Зеркала WenSton",
			description:
				"Зеркала WenSton с подсветкой, сенсорным управлением и антизапотеванием.",
		},
	},
	{
		key: "water-heaters",
		slug: "vodonagrevateli",
		name: "Водонагреватели",
		englishName: "Water Heaters",
		description:
			"Проточные водонагреватели WenSton для компактных, аккуратных и функциональных решений в ванной комнате.",
		image: "/categories/vodonagrevateli.png",
		seo: {
			title: "Водонагреватели WenSton",
			description:
				"Проточные водонагреватели WenSton: компактные модели для ванной комнаты.",
		},
	},
] satisfies Category[];

type PlainRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PlainRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

function getMockCategoryBySlug(slug: string): Category | null {
	return (
		MOCK_CATEGORY_FIXTURES.find(
			(category) =>
				isSameSlug(category.slug, slug) || isSameSlug(category.key, slug),
		) ?? null
	);
}

function getMockCategoryByName(name: string): Category | null {
	return (
		MOCK_CATEGORY_FIXTURES.find((category) => category.name === name) ?? null
	);
}

function getMockCategoryImage(categoryKey: CategoryKey): string | null {
	const featuredProduct = products.find(
		(product) =>
			product.categoryKey === categoryKey && product.images.length > 0,
	);

	return featuredProduct ? getProductPrimaryImage(featuredProduct) : null;
}

function getStrapiCategoriesUrl(): URL | null {
	if (!STRAPI_API_URL) {
		return null;
	}

	const url = new URL("/api/categories", STRAPI_API_URL);
	url.searchParams.set("populate[image]", "true");
	url.searchParams.set("sort", "name:asc");
	url.searchParams.set("pagination[pageSize]", "100");

	return url;
}

function resolveStrapiAssetUrl(url: string | null): string | null {
	if (!url) {
		return null;
	}

	if (/^https?:\/\//i.test(url)) {
		return url;
	}

	if (!STRAPI_API_URL) {
		return url;
	}

	return new URL(url, STRAPI_API_URL).toString();
}

function getStrapiEntryFields(entry: unknown): PlainRecord | null {
	if (!isRecord(entry)) {
		return null;
	}

	const attributes = isRecord(entry.attributes) ? entry.attributes : {};

	return {
		...entry,
		...attributes,
	};
}

function unwrapStrapiMedia(value: unknown): PlainRecord | null {
	if (!isRecord(value)) {
		return null;
	}

	if ("data" in value) {
		const data = value.data;
		const media = Array.isArray(data) ? data[0] : data;

		return unwrapStrapiMedia(media);
	}

	if (isRecord(value.attributes)) {
		return {
			...value,
			...value.attributes,
		};
	}

	return value;
}

function getStrapiImageUrl(value: unknown): string | null {
	const media = unwrapStrapiMedia(value);

	if (!media) {
		return null;
	}

	const formats = isRecord(media.formats) ? media.formats : null;
	const medium = isRecord(formats?.medium)
		? getString(formats.medium.url)
		: null;
	const small = isRecord(formats?.small) ? getString(formats.small.url) : null;
	const original = getString(media.url);

	return resolveStrapiAssetUrl(medium ?? small ?? original);
}

function blockToText(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map(blockToText).join("");
	}

	if (!isRecord(value)) {
		return "";
	}

	if (typeof value.text === "string") {
		return value.text;
	}

	return blockToText(value.children);
}

function getDescription(value: unknown, fallback: string): string {
	if (typeof value === "string") {
		return value.trim() || fallback;
	}

	if (Array.isArray(value)) {
		const text = value
			.map(blockToText)
			.map((block) => block.trim())
			.filter(Boolean)
			.join("\n\n");

		return text || fallback;
	}

	return fallback;
}

function getStrapiCategoryKey(
	fields: PlainRecord,
	slug: string,
	mockCategory: Category | null,
): CategoryKey {
	return (
		getString(fields.key) ??
		getString(fields.categoryKey) ??
		getString(fields.category_key) ??
		getString(fields.code) ??
		mockCategory?.key ??
		slug
	);
}

function getStrapiSeo(value: unknown): Category["seo"] | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const title = getString(value.title) ?? undefined;
	const description = getString(value.description) ?? undefined;

	return title || description ? { title, description } : undefined;
}

function mapStrapiCategory(entry: unknown): Category | null {
	const fields = getStrapiEntryFields(entry);

	if (!fields) {
		return null;
	}

	const name = getString(fields.name);

	if (!name) {
		return null;
	}

	const slug = getString(fields.slug) ?? slugify(name);
	const mockCategory =
		getMockCategoryBySlug(slug) ?? getMockCategoryByName(name);
	const key = getStrapiCategoryKey(fields, slug, mockCategory);

	return {
		key,
		slug,
		name,
		englishName:
			getString(fields.englishName) ??
			getString(fields.english_name) ??
			mockCategory?.englishName ??
			name,
		description: getDescription(
			fields.description,
			mockCategory?.description ?? "",
		),
		image:
			getStrapiImageUrl(fields.image) ??
			mockCategory?.image ??
			getMockCategoryImage(key),
		seo: getStrapiSeo(fields.seo) ?? mockCategory?.seo,
	};
}

function getMockStrapiCategoryEntries(): PlainRecord[] {
	return MOCK_CATEGORY_FIXTURES.map((category, index) => ({
		id: index + 1,
		documentId: `mock-category-${category.key}`,
		key: category.key,
		slug: category.slug,
		name: category.name,
		englishName: category.englishName,
		description: category.description,
		image: category.image ? { url: category.image } : null,
		seo: category.seo,
	}));
}

function getMockCategories(): Category[] {
	return getMockStrapiCategoryEntries()
		.map(mapStrapiCategory)
		.filter((category): category is Category => category !== null);
}

function mergeCategoriesWithMock(apiCategories: Category[]): Category[] {
	const mockCategories = getMockCategories();
	const usedKeys = new Set(apiCategories.map((category) => category.key));
	const usedSlugs = new Set(
		apiCategories.map((category) => category.slug.toLowerCase()),
	);
	const missingMockCategories = mockCategories.filter((category) => {
		return (
			!usedKeys.has(category.key) && !usedSlugs.has(category.slug.toLowerCase())
		);
	});

	return [...apiCategories, ...missingMockCategories];
}

async function fetchStrapiCategories(): Promise<Category[]> {
	const url = getStrapiCategoriesUrl();

	if (!url) {
		return [];
	}

	try {
		const response = await fetch(url, { cache: "no-store" });

		if (!response.ok) {
			return [];
		}

		const payload: unknown = await response.json();
		const entries =
			isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

		return entries
			.map(mapStrapiCategory)
			.filter((category): category is Category => category !== null);
	} catch {
		return [];
	}
}

function normalizeCatalogQuery(query: CatalogQuery): CatalogResult["query"] {
	return {
		...query,
		page: query.page ?? DEFAULT_CATALOG_PAGE,
		perPage: query.perPage ?? DEFAULT_CATALOG_PER_PAGE,
		sort: query.sort ?? DEFAULT_CATALOG_SORT,
		brand: [],
		filters: {},
	};
}

export async function getCategories(): Promise<Category[]> {
	const apiCategories = await fetchStrapiCategories();

	return mergeCategoriesWithMock(apiCategories);
}

export async function getFooterCategories(): Promise<CategoryLink[]> {
	const categories = await getCategories();

	return categories.map(({ key, slug, name }) => ({ key, slug, name }));
}

export async function getCategoryByKey(
	key: CategoryKey,
): Promise<Category | null> {
	const categories = await getCategories();

	return categories.find((category) => category.key === key) ?? null;
}

export async function getCategoryBySlug(
	slug: string,
): Promise<Category | null> {
	const categories = await getCategories();

	return categories.find((category) => isSameSlug(category.slug, slug)) ?? null;
}

export async function getProducts(): Promise<Product[]> {
	return products;
}

export async function getProductBySlug(
	slug: string,
	categoryKey?: CategoryKey,
): Promise<Product | null> {
	return (
		products.find((product) => {
			if (product.slug !== slug) {
				return false;
			}

			return categoryKey ? product.categoryKey === categoryKey : true;
		}) ?? null
	);
}

export async function getCatalog(
	query: CatalogQuery = {},
): Promise<CatalogResult> {
	const normalizedQuery = normalizeCatalogQuery(query);
	const categories = await getCategories();
	const activeCategory = normalizedQuery.categoryKey
		? (categories.find(
				(category) => category.key === normalizedQuery.categoryKey,
			) ?? null)
		: null;
	const filteredProducts = filterProducts(products, normalizedQuery);
	const sortedProducts = sortProducts(filteredProducts, normalizedQuery.sort);
	const paginatedProducts = paginateProducts(
		sortedProducts,
		normalizedQuery.page,
		normalizedQuery.perPage,
	);

	return {
		categories,
		activeCategory,
		products: paginatedProducts.items,
		total: filteredProducts.length,
		pagination: paginatedProducts.meta,
		query: normalizedQuery,
		brandOptions: [],
		filterGroups: [],
	};
}
