import Link from "next/link";

import {
	CatalogSearch,
	CatalogSortControl,
} from "@/components/catalog/catalog-controls";
import { StorefrontBreadcrumbs } from "@/components/catalog/breadcrumbs";
import { ProductCard } from "@/components/catalog/product-card";
import { CatalogPagination } from "@/components/catalog/pagination";
import { Button } from "@/components/ui/button";
import { surfaceVariants } from "@/components/ui/surface";
import { createCatalogHref } from "@/lib/catalog/url";
import { getCategoryHref } from "@/lib/catalog/helpers";
import { cn } from "@/lib/utils";

import type { CatalogResult } from "@/types/catalog";

export function CatalogListing({
	basePath,
	result,
}: {
	basePath: string;
	result: CatalogResult;
}) {
	const { activeCategory, categories, query } = result;
	const categoryByKey = new Map(
		categories.map((category) => [category.key, category]),
	);
	const title = activeCategory?.name ?? "Каталог";
	const description =
		activeCategory?.description ??
		"Единый каталог Leppa & WenSton: сантехника, зеркала и оборудование для современных ванных комнат.";
	const breadcrumbItems = activeCategory
		? [
				{ label: "Главная", href: "/" },
				{ label: "Каталог", href: "/catalog" },
				{ label: activeCategory.name },
			]
		: [{ label: "Главная", href: "/" }, { label: "Каталог" }];

	return (
		<section className="bg-canvas text-ink">
			<div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36 lg:px-10 lg:pb-24 lg:pt-40">
				<StorefrontBreadcrumbs items={breadcrumbItems} />

				<div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.7fr)] lg:items-end">
					<div>
						<h1 className="mt-3 text-4xl font-semibold tracking-normal text-ink sm:text-5xl lg:text-6xl">
							{title}
						</h1>
						<p className="mt-5 max-w-2xl text-base text-ink-muted sm:text-lg">
							{description}
						</p>
					</div>
				</div>

				<div className="mt-8 mb-2 flex gap-2">
					<CatalogSearch
						key={query.search ?? ""}
						basePath={basePath}
						className="lg:justify-self-end lg:w-full"
						search={query.search}
					/>
					<CatalogSortControl
						basePath={basePath}
						sort={query.sort}
					/>
				</div>

				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<nav
						aria-label="Категории каталога"
						className="flex gap-2 overflow-x-auto py-4">
						<Button
							asChild
							variant={!activeCategory ? "dark" : "secondary"}
							size="sm">
							<Link
								href={createCatalogHref("/catalog", {
									search: query.search,
									sort: query.sort,
								})}
								className="shrink-0">
								Все товары
							</Link>
						</Button>
						{categories.map((category) => (
							<Button
								key={category.key}
								asChild
								variant={
									activeCategory?.key === category.key ? "dark" : "secondary"
								}
								size="sm">
								<Link
									href={createCatalogHref(getCategoryHref(category), {
										search: query.search,
										sort: query.sort,
									})}
									className="shrink-0">
									{category.name}
								</Link>
							</Button>
						))}
					</nav>
				</div>

				{result.products.length > 0 ? (
					<div className="mt-8 grid gap-x-3 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{result.products.map((product) => (
							<ProductCard
								key={product.id}
								category={categoryByKey.get(product.categoryKey) ?? null}
								product={product}
							/>
						))}
					</div>
				) : (
					<div
						className={cn(
							surfaceVariants({ variant: "empty" }),
							"mt-8 px-6 py-12 text-sm text-ink-muted",
						)}>
						По выбранным параметрам товаров не найдено.
					</div>
				)}

				<CatalogPagination
					basePath={basePath}
					pagination={result.pagination}
					query={query}
				/>
			</div>
		</section>
	);
}
