import {
	buildBrandOptions,
	buildFilterGroups,
	filterProducts,
	paginateProducts,
	sortProducts,
} from "@/lib/catalog/filters";
import {
	DEFAULT_CATALOG_PAGE,
	DEFAULT_CATALOG_PER_PAGE,
	DEFAULT_CATALOG_SORT,
} from "@/lib/catalog/query";
import { isSameSlug } from "@/lib/utils/slug";

import type {
	CatalogQuery,
	CatalogResult,
	Category,
	CategoryKey,
	CategoryLink,
	Product,
	ProductAttribute,
	ProductAttributeValue,
	ProductImage,
} from "@/types/catalog";

type PlainRecord = Record<string, unknown>;

const STRAPI_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN?.trim() || null;
const STRAPI_PAGE_SIZE = 100;
const STRAPI_MAX_PAGES = 100;

function isRecord(value: unknown): value is PlainRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

function getNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);

		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

function getBoolean(value: unknown): boolean {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "string") {
		return value.toLowerCase() === "true";
	}

	return false;
}

function getStrapiApiUrl(pathname: string): URL | null {
	if (!STRAPI_API_URL) {
		return null;
	}

	return new URL(pathname, STRAPI_API_URL);
}

function getStrapiRequestHeaders(): HeadersInit | undefined {
	if (!STRAPI_API_TOKEN) {
		return undefined;
	}

	return {
		Authorization: `Bearer ${STRAPI_API_TOKEN}`,
	};
}

async function readResponsePreview(response: Response): Promise<string> {
	try {
		const text = await response.text();
		const trimmed = text.trim();

		if (!trimmed) {
			return "(empty body)";
		}

		return trimmed.slice(0, 300);
	} catch {
		return "(body unreadable)";
	}
}

function logStrapiRequestError(
	pathname: string,
	url: URL,
	response: Response,
	bodyPreview: string,
) {
	const message = [
		`[strapi] Request failed for ${pathname}`,
		`${response.status} ${response.statusText}`,
		url.toString(),
		bodyPreview,
	].join(" | ");

	console.error(message);
}

async function fetchStrapiJson(url: URL, pathname: string): Promise<unknown | null> {
	try {
		const response = await fetch(url, {
			cache: "no-store",
			headers: getStrapiRequestHeaders(),
		});

		if (!response.ok) {
			const preview = await readResponsePreview(response);
			logStrapiRequestError(pathname, url, response, preview);
			return null;
		}

		return (await response.json()) as unknown;
	} catch (error) {
		console.error(
			`[strapi] Request failed for ${pathname} | ${url.toString()} | ${
				error instanceof Error ? error.message : "unknown error"
			}`,
		);
		return null;
	}
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

function unwrapStrapiRelation(value: unknown): PlainRecord | null {
	if (!isRecord(value)) {
		return null;
	}

	if ("data" in value) {
		const data = value.data;
		const relation = Array.isArray(data) ? data[0] : data;

		return getStrapiEntryFields(relation);
	}

	return getStrapiEntryFields(value);
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

	return getStrapiEntryFields(value);
}

function unwrapStrapiMediaList(value: unknown): PlainRecord[] {
	if (Array.isArray(value)) {
		return value
			.map(unwrapStrapiMedia)
			.filter((media): media is PlainRecord => media !== null);
	}

	if (isRecord(value) && "data" in value) {
		const data = value.data;

		if (Array.isArray(data)) {
			return data
				.map(unwrapStrapiMedia)
				.filter((media): media is PlainRecord => media !== null);
		}
	}

	const media = unwrapStrapiMedia(value);

	return media ? [media] : [];
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

function getDescription(value: unknown, fallback = ""): string {
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

function getStrapiSeo(value: unknown): Category["seo"] | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const title = getString(value.title) ?? undefined;
	const description = getString(value.description) ?? undefined;

	return title || description ? { title, description } : undefined;
}

function isAttributeValue(value: unknown): value is ProductAttributeValue {
	return (
		typeof value === "string"
		|| typeof value === "number"
		|| typeof value === "boolean"
	);
}

function parseJsonArray(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim()) {
		try {
			const parsed = JSON.parse(value);

			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	return [];
}

function normalizeAttributeRecords(value: unknown): PlainRecord[] {
	const normalizedArray = parseJsonArray(value);

	if (normalizedArray.length > 0) {
		return normalizedArray.filter((entry): entry is PlainRecord => isRecord(entry));
	}

	if (isRecord(value)) {
		if (Array.isArray(value.attributes)) {
			return value.attributes.filter((entry): entry is PlainRecord => isRecord(entry));
		}

		return Object.entries(value)
			.filter(([, attributeValue]) => isAttributeValue(attributeValue))
			.map(([key, attributeValue]) => ({
				key,
				label: key,
				value: attributeValue,
			}));
	}

	return [];
}

function mapProductAttributes(value: unknown): ProductAttribute[] {
	const attributes: ProductAttribute[] = [];

	normalizeAttributeRecords(value).forEach((attribute) => {
		if (!isRecord(attribute)) {
			return;
		}

		const key = getString(attribute.key);
		const label = getString(attribute.label);
		const attributeValue = attribute.value;

		if (!key || !label || !isAttributeValue(attributeValue)) {
			return;
		}

		const unit = getString(attribute.unit);

		attributes.push({
			key,
			label,
			value: attributeValue,
			...(unit ? { unit } : {}),
		});
	});

	return attributes;
}

function mapProductImages(value: unknown, productName: string): ProductImage[] {
	const images: ProductImage[] = [];

	unwrapStrapiMediaList(value).forEach((media, index) => {
		const url = getStrapiImageUrl(media);

		if (!url) {
			return;
		}

		const label = getString(media.caption) ?? getString(media.name);
		const alt =
			getString(media.alternativeText) ??
			getString(media.caption) ??
			productName;

		images.push({
			url,
			alt,
			...(label ? { label } : {}),
			...(index === 0 ? { role: "main" } : {}),
		});
	});

	return images;
}

function mapProductVideos(value: unknown): string[] {
	return unwrapStrapiMediaList(value)
		.map((media) => resolveStrapiAssetUrl(getString(media.url)))
		.filter((url): url is string => url !== null);
}

function getPaginationPageCount(payload: unknown): number | null {
	if (!isRecord(payload) || !isRecord(payload.meta)) {
		return null;
	}

	if (!isRecord(payload.meta.pagination)) {
		return null;
	}

	return getNumber(payload.meta.pagination.pageCount);
}

async function fetchStrapiCollection(
	pathname: string,
	configureUrl?: (url: URL) => void,
): Promise<unknown[]> {
	const firstUrl = getStrapiApiUrl(pathname);

	if (!firstUrl) {
		return [];
	}

	const entries: unknown[] = [];
	let page = 1;
	let pageCount: number | null = null;

	do {
		const url = getStrapiApiUrl(pathname);

		if (!url) {
			return entries;
		}

		configureUrl?.(url);
		url.searchParams.set("pagination[page]", String(page));
		url.searchParams.set("pagination[pageSize]", String(STRAPI_PAGE_SIZE));

		const payload = await fetchStrapiJson(url, pathname);
		if (!payload) {
			return entries;
		}

		const data = isRecord(payload) && Array.isArray(payload.data)
			? payload.data
			: [];

		entries.push(...data);
		pageCount = getPaginationPageCount(payload);

		if (!pageCount && data.length < STRAPI_PAGE_SIZE) {
			break;
		}

		page += 1;
	} while (pageCount ? page <= pageCount : page < STRAPI_MAX_PAGES);

	return entries;
}

function mapStrapiCategory(entry: unknown): Category | null {
	const fields = getStrapiEntryFields(entry);

	if (!fields) {
		return null;
	}

	const name = getString(fields.name);
	const slug = getString(fields.slug);

	if (!name || !slug) {
		return null;
	}

	return {
		key: slug,
		slug,
		name,
		englishName:
			getString(fields.englishName) ??
			getString(fields.english_name) ??
			name,
		description: getDescription(fields.description),
		image: getStrapiImageUrl(fields.image),
		seo: getStrapiSeo(fields.seo),
	};
}

function mapStrapiProduct(entry: unknown): Product | null {
	const fields = getStrapiEntryFields(entry);

	if (!fields) {
		return null;
	}

	const name = getString(fields.name);
	const slug = getString(fields.slug);
	const categoryFields = unwrapStrapiRelation(fields.category);
	const categorySlug = getString(categoryFields?.slug)
		?? getString(fields.categorySlug)
		?? getString(fields.category_key);

	if (!name || !slug || !categorySlug) {
		return null;
	}

	return {
		id:
			getString(fields.documentId) ??
			getString(fields.id) ??
			String(getNumber(fields.id) ?? slug),
		slug,
		sku: getString(fields.sku),
		name,
		brand: getString(fields.brand),
		model: getString(fields.model),
		categoryKey: categorySlug,
		price: getNumber(fields.price),
		currency: getString(fields.currency),
		inStock: getBoolean(fields.inStock),
		description: getDescription(fields.description),
		images: mapProductImages(fields.images, name),
		videos: mapProductVideos(fields.videos),
		attributes: mapProductAttributes(fields.attributes),
	};
}

async function fetchStrapiCategories(): Promise<Category[]> {
	const entries = await fetchStrapiCollection("/api/categories", (url) => {
		url.searchParams.set("populate[image]", "true");
		url.searchParams.set("sort", "name:asc");
	});

	return entries
		.map(mapStrapiCategory)
		.filter((category): category is Category => category !== null);
}

async function fetchStrapiProducts(): Promise<Product[]> {
	const entries = await fetchStrapiCollection("/api/products", (url) => {
		url.searchParams.set("populate[images]", "true");
		url.searchParams.set("populate[videos]", "true");
		url.searchParams.set("populate[category]", "true");
		url.searchParams.set("sort", "name:asc");
	});

	return entries
		.map(mapStrapiProduct)
		.filter((product): product is Product => product !== null);
}

function normalizeCatalogQuery(query: CatalogQuery): CatalogResult["query"] {
	return {
		...query,
		page: query.page ?? DEFAULT_CATALOG_PAGE,
		perPage: query.perPage ?? DEFAULT_CATALOG_PER_PAGE,
		sort: query.sort ?? DEFAULT_CATALOG_SORT,
		brand: query.brand ?? [],
		filters: query.filters ?? {},
	};
}

export async function getCategories(): Promise<Category[]> {
	return fetchStrapiCategories();
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
	return fetchStrapiProducts();
}

export async function getProductBySlug(
	slug: string,
	categoryKey?: CategoryKey,
): Promise<Product | null> {
	const products = await getProducts();

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
	const searchlessQuery = {
		...normalizedQuery,
		search: undefined,
	};
	const [categories, allProducts] = await Promise.all([
		getCategories(),
		getProducts(),
	]);
	const activeCategory = normalizedQuery.categoryKey
		? (categories.find(
				(category) => category.key === normalizedQuery.categoryKey,
			) ?? null)
		: null;
	const filteredCatalogProducts = filterProducts(allProducts, normalizedQuery);
	const searchableProducts = sortProducts(
		filterProducts(allProducts, searchlessQuery),
		normalizedQuery.sort,
	);
	const paginatedResult = paginateProducts(
		searchableProducts,
		normalizedQuery.page,
		normalizedQuery.perPage,
	);

	return {
		categories,
		activeCategory,
		products: paginatedResult.items,
		searchableProducts,
		total: paginatedResult.meta.total,
		pagination: paginatedResult.meta,
		query: normalizedQuery,
		brandOptions: buildBrandOptions(filteredCatalogProducts),
		filterGroups: buildFilterGroups(filteredCatalogProducts),
	};
}
