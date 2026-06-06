import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { StorefrontBreadcrumbs } from "@/components/catalog/breadcrumbs";
import { ProductBackButton } from "@/components/catalog/product-back-button";
import { ProductAvailabilityBadge } from "@/components/catalog/product-availability-badge";
import { ProductSkuCopy } from "@/components/catalog/product-sku-copy";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductInfoTabs } from "@/components/catalog/product-info-tabs";
import { ProductScrollToTop } from "@/components/catalog/product-scroll-to-top";
import { Button } from "@/components/ui/button";
import { ProductActions } from "@/components/shop/product-actions";
import {
	getCategoryHref,
	getProductImageAlt,
} from "@/lib/catalog/helpers";
import { getShopProductSnapshot } from "@/lib/shop/product";
import { formatProductPrice } from "@/lib/utils/price";

import type { Category, Product } from "@/types/catalog";

export function ProductDetail({
	category,
	product,
}: {
	category: Category;
	product: Product;
}) {
	const galleryFallbackAlt = getProductImageAlt(product);
	const shopProduct = getShopProductSnapshot(product, category);
	const categoryHref = getCategoryHref(category);
	const intro = product.description
		.split(/\n{2,}/)
		.at(-1)
		?.trim();

	return (
		<article className="bg-canvas text-ink">
			<ProductScrollToTop />

			<div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36 lg:px-10 lg:pb-24 lg:pt-40">
				<div className="flex min-w-0 items-center gap-5">
					<ProductBackButton fallbackHref={categoryHref} />

					<StorefrontBreadcrumbs
						className="min-w-0 flex-1"
						items={[
							{ label: "Главная", href: "/" },
							{ label: "Каталог", href: "/catalog" },
							{ label: category.name, href: categoryHref },
							{ label: product.name },
						]}
					/>
				</div>

				<div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start">
					<ProductGallery
						images={product.images}
						fallbackAlt={galleryFallbackAlt}
					/>

					<div className="min-w-0 lg:sticky lg:top-28">
						<div className="flex flex-col items-start gap-3">
							<ProductAvailabilityBadge product={product} />
							<ProductSkuCopy
								size="detail"
								sku={product.sku}
							/>
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

						<div className="mt-6 border-b border-hairline py-5">
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

						{/* <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-hairline pt-5">
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
						</dl> */}
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
