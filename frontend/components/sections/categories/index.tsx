import { getCategories } from "@/lib/api";

import { CategoryCard } from "./category-card";
import { CategoryState } from "./category-state";
import { getCategoryGridClassName } from "./category-layout";

const DEBUG_CATEGORIES =
	process.env.DEBUG_CATEGORIES === "true"
	|| process.env.NEXT_PUBLIC_DEBUG_CATEGORIES === "true";

export async function CategoriesSection() {
	const visibleCategories = await getCategories();
	const categoryCount = visibleCategories.length;

	if (DEBUG_CATEGORIES) {
		console.log("[categories] data before render", {
			categoryCount,
			visibleCategories,
		});
		console.log("[categories] final categories", visibleCategories);
	}

	return (
		<section
			id="categories"
			aria-labelledby="categories-title"
			className="bg-canvas text-ink">
			<div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pb-12 sm:pt-20 lg:px-14 lg:pb-14 lg:pt-24">
				<div className="mx-auto max-w-2xl text-center">
					<h2
						id="categories-title"
						className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl lg:text-6xl">
						Категории
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-sm text-ink-muted sm:text-base lg:text-lg">
						Подборка ключевых направлений Leppa & WenSton для частных
						интерьеров, дизайнерских проектов и комплектации объектов.
					</p>
				</div>

				{categoryCount > 0 ? (
					<div
						className={getCategoryGridClassName(
							categoryCount,
							"mt-10 lg:mt-12",
						)}>
						{visibleCategories.map((category) => (
							<CategoryCard
								key={category.key}
								category={category}
							/>
						))}
					</div>
				) : (
					<CategoryState variant="empty" />
				)}
			</div>
		</section>
	);
}
