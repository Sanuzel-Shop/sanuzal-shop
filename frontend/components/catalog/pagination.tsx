import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { createCatalogHref } from "@/lib/catalog/url";
import { cn } from "@/lib/utils";

import type { CatalogQuery, PaginationMeta } from "@/types/catalog";

export function CatalogPagination({
	basePath,
	pagination,
	query,
}: {
	basePath: string;
	pagination: PaginationMeta;
	query: CatalogQuery;
}) {
	if (pagination.totalPages <= 1) {
		return null;
	}

	const pages = Array.from(
		{ length: pagination.totalPages },
		(_, index) => index + 1,
	);

	return (
		<nav
			aria-label="Навигация по страницам каталога"
			className="mt-10 flex flex-wrap items-center justify-center gap-2">
			<Link
				href={createCatalogHref(basePath, {
					...query,
					page: Math.max(1, pagination.page - 1),
				})}
				aria-disabled={!pagination.hasPreviousPage}
				className={cn(
					buttonVariants({ variant: "secondary", size: "icon" }),
					!pagination.hasPreviousPage && "pointer-events-none opacity-45",
				)}>
				<ChevronLeft
					aria-hidden="true"
					className="h-4 w-4"
				/>
				<span className="sr-only">Предыдущая страница</span>
			</Link>

			{pages.map((page) => {
				const isActive = page === pagination.page;

				return (
					<Link
						key={page}
						href={createCatalogHref(basePath, { ...query, page })}
						aria-current={isActive ? "page" : undefined}
							className={buttonVariants({
								variant: isActive ? "dark" : "secondary",
								size: "icon",
							})}>
						{page}
					</Link>
				);
			})}

			<Link
				href={createCatalogHref(basePath, {
					...query,
					page: Math.min(pagination.totalPages, pagination.page + 1),
				})}
				aria-disabled={!pagination.hasNextPage}
				className={cn(
					buttonVariants({ variant: "secondary", size: "icon" }),
					!pagination.hasNextPage && "pointer-events-none opacity-45",
				)}>
				<ChevronRight
					aria-hidden="true"
					className="h-4 w-4"
				/>
				<span className="sr-only">Следующая страница</span>
			</Link>
		</nav>
	);
}
