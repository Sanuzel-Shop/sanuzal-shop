"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
	CATALOG_FILTER_PARAM,
	CATALOG_SORT_OPTIONS,
	DEFAULT_CATALOG_SORT,
} from "@/lib/catalog/query";
import { cn } from "@/lib/utils";

import type { CatalogSort } from "@/types/catalog";

function useCatalogNavigation(basePath: string) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	function replaceParams(update: (params: URLSearchParams) => void) {
		const params = new URLSearchParams(searchParams.toString());

		update(params);
		params.delete("page");
		params.delete("brand");
		params.delete(CATALOG_FILTER_PARAM);

		const queryString = params.toString();
		const nextUrl = queryString ? `${basePath}?${queryString}` : basePath;

		startTransition(() => {
			router.replace(nextUrl, { scroll: false });
		});
	}

	return replaceParams;
}

export function CatalogSearch({
	basePath,
	className,
	search,
}: {
	basePath: string;
	className?: string;
	search?: string;
}) {
	const replaceParams = useCatalogNavigation(basePath);
	const [value, setValue] = useState(search ?? "");

	function updateSearch(nextValue: string) {
		setValue(nextValue);
		replaceParams((params) => {
			if (nextValue.trim()) {
				params.set("q", nextValue.trim());
			} else {
				params.delete("q");
			}
		});
	}

	return (
		<label className={cn("relative block min-w-0", className)}>
			<span className="sr-only">Поиск по каталогу</span>
			<Search
				aria-hidden="true"
				className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
			/>
			<Input
				value={value}
				onChange={(event) => {
					updateSearch(event.target.value);
				}}
				placeholder="Поиск по названию, артикулу или характеристикам"
				className="pl-11 pr-11"
			/>
			{value ? (
				<Button
					type="button"
					variant="secondary"
					size="icon"
					aria-label="Очистить поиск"
					className="absolute right-1.5 top-1/2 size-9 -translate-y-1/2 shadow-none"
					onClick={() => {
						updateSearch("");
					}}>
					<X aria-hidden="true" />
				</Button>
			) : null}
		</label>
	);
}

export function CatalogSortControl({
	basePath,
	sort,
}: {
	basePath: string;
	sort: CatalogSort;
}) {
	const replaceParams = useCatalogNavigation(basePath);

	return (
		<label className="flex w-full items-center gap-2 text-sm text-ink-muted sm:w-auto">
			<Select
				value={sort}
				className="min-w-[190px] bg-frost shadow-none"
				onChange={(event) => {
					const nextSort = event.target.value as CatalogSort;

					replaceParams((params) => {
						if (nextSort === DEFAULT_CATALOG_SORT) {
							params.delete("sort");
						} else {
							params.set("sort", nextSort);
						}
					});
				}}>
				{CATALOG_SORT_OPTIONS.map((option) => (
					<option
						key={option.value}
						value={option.value}>
						{option.label}
					</option>
				))}
			</Select>
		</label>
	);
}
