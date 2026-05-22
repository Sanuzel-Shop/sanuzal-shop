import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { StorefrontBreadcrumbs } from "@/components/catalog/breadcrumbs";
import { ProductInfoTabs } from "@/components/catalog/product-info-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductActions } from "@/components/shop/product-actions";
import { surfaceVariants } from "@/components/ui/surface";
import {
	getCategoryHref,
	getProductImageAlt,
	getProductPrimaryImage,
} from "@/lib/catalog/helpers";
import { getShopProductSnapshot } from "@/lib/shop/product";
import { formatProductPrice } from "@/lib/utils/price";
import { cn } from "@/lib/utils";

import type { Category, Product } from "@/types/catalog";

export function ProductDetail({
	category,
	product,
}: {
	category: Category;
	product: Product;
}) {
	const mainImage = getProductPrimaryImage(product);
	const mainImageAlt = getProductImageAlt(product);
	const gallery = product.images.length > 0
		? product.images.slice(0, 5)
		: [{ url: "/no-image.png", alt: product.name, role: "placeholder" }];
	const shopProduct = getShopProductSnapshot(product, category);
	const intro = product.description
		.split(/\n{2,}/)
		.at(-1)
		?.trim();

	return (
		<article className="bg-canvas text-ink">
			<div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36 lg:px-10 lg:pb-24 lg:pt-40">
				<StorefrontBreadcrumbs
					items={[
						{ label: "Главная", href: "/" },
						{ label: "Каталог", href: "/catalog" },
						{ label: category.name, href: getCategoryHref(category) },
						{ label: product.name },
					]}
				/>

				<div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start">
					<div className="min-w-0">
						<div
							className={cn(
								surfaceVariants({ variant: "media" }),
								"relative aspect-[4/3] overflow-hidden",
							)}>
							<div
								role="img"
								aria-label={mainImageAlt}
								className="absolute inset-0 bg-contain bg-center bg-no-repeat"
								style={{ backgroundImage: `url(${mainImage})` }}
							/>
						</div>

						{gallery.length > 1 ? (
							<div className="mt-3 grid grid-cols-5 gap-3">
								{gallery.map((image, index) => (
									<div
										key={`${image.url}-${index}`}
										role="img"
										aria-label={image.alt ?? product.name}
										className={cn(
											surfaceVariants({ variant: "muted" }),
											"aspect-square bg-contain bg-center bg-no-repeat",
										)}
										style={{ backgroundImage: `url(${image.url})` }}
									/>
								))}
							</div>
						) : null}
					</div>

					<div className="min-w-0 lg:sticky lg:top-28">
						<div className="flex flex-wrap items-center gap-2">
							{product.sku ? (
								<Badge>Арт. {product.sku}</Badge>
							) : null}
							<Badge className="gap-2">
								<span className="size-1.5 rounded-full bg-ink" />
								В наличии
							</Badge>
						</div>

						<p className="mt-5 text-sm font-semibold uppercase tracking-normal text-ink-faint">
							{product.brand ?? "Leppa & WenSton"}
						</p>
						<h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink sm:text-4xl lg:text-5xl">
							{product.name}
						</h1>

						{intro ? (
							<p className="mt-5 text-base leading-relaxed text-ink-muted">
								{intro}
							</p>
						) : null}

						<div className="mt-6 border-y border-hairline py-5">
							<p className="text-3xl font-semibold tracking-normal text-ink">
								{formatProductPrice(product)}
							</p>
						</div>

						<div className="mt-5">
							<ProductActions product={shopProduct} />
						</div>

						<div className="mt-3">
							<Button
								asChild
								variant="secondary"
								className="w-full">
								<Link href="/contact">
									<MessageCircle
										aria-hidden="true"
										className="h-4 w-4"
									/>
									Запросить консультацию
								</Link>
							</Button>
						</div>

						<dl className="mt-6 grid grid-cols-2 gap-3 border-t border-hairline pt-5">
							<div
								className={cn(
									surfaceVariants({ variant: "muted" }),
									"px-4 py-3",
								)}>
								<dt className="text-xs text-ink-faint">Бренд</dt>
								<dd className="mt-1 text-sm font-semibold text-ink">
									{product.brand ?? "Leppa & WenSton"}
								</dd>
							</div>
							<div
								className={cn(
									surfaceVariants({ variant: "muted" }),
									"px-4 py-3",
								)}>
								<dt className="text-xs text-ink-faint">Модель</dt>
								<dd className="mt-1 text-sm font-semibold text-ink">
									{product.model ?? product.sku ?? "—"}
								</dd>
							</div>
						</dl>
					</div>
				</div>

				<ProductInfoTabs
					attributes={product.attributes}
					description={product.description}
				/>
			</div>
		</article>
	);
}
