export type CategoryKey = string;

export type CategorySeo = {
	title?: string;
	description?: string;
};

export type Category = {
	key: CategoryKey;
	slug: string;
	name: string;
	englishName: string;
	description: string;
	image?: string | null;
	seo?: CategorySeo;
};

export type CategoryLink = Pick<Category, "key" | "slug" | "name">;

export type ProductAttributeValue = string | number | boolean;

export type ProductAttribute = {
	key: string;
	label: string;
	value: ProductAttributeValue;
	unit?: string;
};

export type ProductImage = {
	url: string;
	role?: string;
	label?: string;
	alt?: string;
};

export type Product = {
	id: string;
	slug: string;
	sku: string | null;
	name: string;
	brand: string | null;
	model: string | null;
	categoryKey: CategoryKey;
	price: number | null;
	currency: string | null;
	inStock: boolean;
	description: string;
	images: ProductImage[];
	videos: string[];
	attributes: ProductAttribute[];
};

export type CatalogSort =
	| "featured"
	| "name-asc"
	| "name-desc"
	| "price-asc"
	| "price-desc";

export type CatalogFilters = Record<string, string[]>;

export type CatalogQuery = {
	categoryKey?: CategoryKey;
	search?: string;
	page?: number;
	perPage?: number;
	sort?: CatalogSort;
	brand?: string[];
	filters?: CatalogFilters;
};

export type CatalogFilterOption = {
	value: string;
	label: string;
	count: number;
};

export type CatalogFilterGroup = {
	key: string;
	label: string;
	options: CatalogFilterOption[];
};

export type PaginationMeta = {
	page: number;
	perPage: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type CatalogResult = {
	categories: Category[];
	activeCategory: Category | null;
	products: Product[];
	searchableProducts: Product[];
	total: number;
	pagination: PaginationMeta;
	query: Required<Pick<CatalogQuery, "page" | "perPage" | "sort">> &
		Omit<CatalogQuery, "page" | "perPage" | "sort">;
	brandOptions: CatalogFilterOption[];
	filterGroups: CatalogFilterGroup[];
};
