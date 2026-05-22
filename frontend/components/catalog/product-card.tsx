import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ProductAvailabilityBadge } from "@/components/catalog/product-availability-badge";
import { ProductActions } from "@/components/shop/product-actions";
import { surfaceVariants } from "@/components/ui/surface";
import {
	getProductHref,
	getProductImageAlt,
	getProductPrimaryImage,
} from "@/lib/catalog/helpers";
import { getShopProductSnapshot } from "@/lib/shop/product";
import { formatAttributeValue, formatProductPrice } from "@/lib/utils/price";
import { cn } from "@/lib/utils";

import type { Category, Product } from "@/types/catalog";

function getCardAttributes(product: Product) {
	return product.attributes
		.filter((attribute) => {
			return !["warranty", "countryOfOrigin"].includes(attribute.key);
		})
		.slice(0, 3);
}

export function ProductCard({
	category,
	product,
}: {
	category?: Category | null;
	product: Product;
}) {
	const imageSrc = getProductPrimaryImage(product);
	const imageAlt = getProductImageAlt(product);
	const href = getProductHref(product, category);
	const cardAttributes = getCardAttributes(product);
	const shopProduct = getShopProductSnapshot(product, category);

	return (
		<article
			className={cn(
				surfaceVariants({ variant: "card" }),
				"hover-lift-card relative flex h-full min-w-0 flex-col p-3",
			)}>
			<Link
				href={href}
				aria-label={`Открыть товар ${product.name}`}
				className="absolute inset-0 z-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			/>

			<div className="pointer-events-none relative z-10">
				<div
					className={cn(
						surfaceVariants({ variant: "media" }),
						"relative aspect-[4/3] overflow-hidden",
					)}>
					<div
						role="img"
						aria-label={imageAlt}
						className="absolute inset-0 bg-contain bg-center bg-no-repeat"
						style={{ backgroundImage: `url(${imageSrc})` }}
					/>
				</div>
			</div>

			<div className="pointer-events-none relative z-10 flex flex-1 flex-col p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						{product.sku ? (
							<p className="mt-1 text-xs text-ink-faint">
								<span className="font-bold">АРТИКУЛ:</span>{" "}
								<span className="text-foreground font-medium">
									{product.sku}
								</span>
							</p>
						) : null}

						{/* {category ? (
							<p className="text-xs font-semibold uppercase tracking-normal text-ink-faint">
								{category.name}
							</p>
						) : null} */}

						<h2 className="mt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-snug text-ink">
							{product.name}
						</h2>
						<ProductAvailabilityBadge
							product={product}
							className="mt-2"
						/>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap gap-2">
					{cardAttributes.map((attribute) => (
						<Badge
							key={`${attribute.key}-${attribute.value}`}
							size="sm">
							{formatAttributeValue(attribute)}
						</Badge>
					))}
				</div>

				<hr className="mt-4" />

				<div className="mt-auto flex items-center justify-center pt-5">
					<p className="text-base font-semibold text-ink">
						{formatProductPrice(product)}
					</p>
					<div className="pointer-events-auto relative z-20">
						<ProductActions
							layout="card"
							product={shopProduct}
						/>
					</div>
				</div>
			</div>
		</article>
	);
}

export function ProductCardSkeleton() {
	return (
		<article
			aria-hidden="true"
			className={cn(
				surfaceVariants({ variant: "card" }),
				"flex h-full min-w-0 flex-col p-3",
			)}>
			<div
				className={cn(
					surfaceVariants({ variant: "media" }),
					"aspect-[4/3] animate-pulse overflow-hidden",
				)}
			/>
			<div className="flex flex-1 flex-col p-4">
				<div className="h-3 w-24 animate-pulse rounded-full bg-toolbar" />
				<div className="mt-3 h-5 w-4/5 animate-pulse rounded-full bg-toolbar" />
				<div className="mt-3 h-6 w-24 animate-pulse rounded-full bg-toolbar" />

				<div className="mt-4 flex flex-wrap gap-2">
					<div className="h-7 w-20 animate-pulse rounded-full bg-toolbar" />
					<div className="h-7 w-24 animate-pulse rounded-full bg-toolbar" />
				</div>

				<hr className="mt-4" />

				<div className="mt-auto pt-5">
					<div className="h-5 w-28 animate-pulse rounded-full bg-toolbar" />
					<div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
						<div className="h-9 animate-pulse rounded-full bg-toolbar" />
						<div className="size-9 animate-pulse rounded-full bg-toolbar" />
					</div>
				</div>
			</div>
		</article>
	);
}
