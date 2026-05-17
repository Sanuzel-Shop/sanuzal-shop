"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useApi } from "@/hooks/useApi";

import { getCategories } from "@/lib/api";
import { cn } from "@/lib/utils";

import type { Category } from "@/types";

function sortCategories(categories: Category[]) {
	return [...categories].sort((first, second) => {
		return first.sortOrder - second.sortOrder;
	});
}

function CategoryMedia({ category }: { category: Category }) {
	const imageSrc = category.image || "/no-image.png";

	return (
		<div className='relative h-48 overflow-hidden rounded-sm border border-hairline sm:h-52'>
			<div
				aria-label={category.name}
				role='img'
				className='absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105'
				style={{ backgroundImage: `url(${imageSrc})` }}
			/>
			<div className='absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent' />
		</div>
	);
}

function CategoryCard({
	category,
	isWide,
}: {
	category: Category;
	isWide: boolean;
}) {
	return (
		<Link
			href={`/categories/${category.handle}`}
			className={cn(
				"group hover-lift-card flex h-full min-h-[360px] flex-col rounded-md border border-hairline bg-canvas p-3 shadow-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				isWide && "lg:col-span-2",
			)}>
			<CategoryMedia category={category} />

			<div className='flex flex-1 flex-col px-2 pb-2 pt-5'>
				<div className='flex items-start justify-between gap-4'>
					<div>
						<p className='text-xs font-medium text-ink-faint'>Категория</p>
						<h3 className='mt-2 text-2xl font-semibold tracking-normal text-ink sm:text-3xl'>
							{category.name}
						</h3>
					</div>

					<span className='flex size-10 shrink-0 items-center justify-center rounded-sm border border-hairline bg-frost text-ink transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-ink group-hover:bg-ink group-hover:text-on-dark'>
						<ArrowUpRight
							aria-hidden='true'
							className='h-5 w-5'
							strokeWidth={1.8}
						/>
					</span>
				</div>

				<p className='mt-4 text-sm text-ink-muted sm:text-base'>
					{category.description}
				</p>
			</div>
		</Link>
	);
}

function CategoryCardSkeleton({ isWide }: { isWide: boolean }) {
	return (
		<article
			aria-hidden='true'
			className={cn(
				"min-h-[360px] rounded-md border border-hairline bg-canvas p-3 shadow-control",
				isWide && "lg:col-span-2",
			)}>
			<div className='h-48 animate-pulse rounded-sm bg-toolbar sm:h-52' />
			<div className='px-2 pb-2 pt-5'>
				<div className='h-3 w-20 animate-pulse rounded-full bg-toolbar' />
				<div className='mt-4 h-8 w-2/3 animate-pulse rounded-full bg-toolbar' />
				<div className='mt-5 space-y-3'>
					<div className='h-3 w-full animate-pulse rounded-full bg-toolbar' />
					<div className='h-3 w-5/6 animate-pulse rounded-full bg-toolbar' />
				</div>
			</div>
		</article>
	);
}

export function CategoriesSection() {
	const {
		data: categories,
		loading,
		error,
	} = useApi<Category[]>(getCategories);

	const sortedCategories = sortCategories(categories ?? []);

	const statusText = loading
		? "Загружаем категории..."
		: error
			? "Не удалось загрузить категории."
			: sortedCategories.length === 0
				? "Категории пока не добавлены."
				: "";

	return (
		<section
			id='categories'
			aria-labelledby='categories-title'
			className='bg-canvas text-ink'>
			<div className='mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:px-14 lg:py-24'>
				<div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
					<div className='max-w-2xl'>
						<h2
							id='categories-title'
							className='text-3xl font-semibold tracking-normal text-ink sm:text-4xl lg:text-6xl'>
							Категории
						</h2>
						<p className='mt-4 text-sm text-ink-muted sm:text-base lg:text-lg'>
							Подборка ключевых направлений Leppa & WenSton для частных
							интерьеров, дизайнерских проектов и комплектации объектов.
						</p>
					</div>

					<p
						aria-live='polite'
						className='min-h-5 text-sm text-ink-faint'>
						{statusText}
					</p>
				</div>

				<div className='mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3'>
					{loading
						? Array.from({ length: 5 }).map((_, index) => (
								<CategoryCardSkeleton
									key={index}
									isWide={index === 0}
								/>
							))
						: sortedCategories.map((category, index) => (
								<CategoryCard
									key={category.id}
									category={category}
									isWide={index === 0}
								/>
							))}
				</div>
			</div>
		</section>
	);
}
