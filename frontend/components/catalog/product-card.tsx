import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
				"hover-lift-card flex h-full min-w-0 flex-col p-3",
			)}>
			<Link
				href={href}
				aria-label={`Открыть товар ${product.name}`}
				className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
			</Link>

			<div className="flex flex-1 flex-col p-4">
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

						<Link
							href={href}
							className="mt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-snug text-ink">
							{product.name}
						</Link>
						<Badge className="gap-2 mt-2">
							<span className="size-2 rounded-full bg-green-500" />В наличии
						</Badge>
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

				<hr className="mt-4"/>

				<div className="mt-auto pt-5">
					<p className="text-base font-semibold text-ink">
						{formatProductPrice(product)}
					</p>
					<div className="mt-4">
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
