import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ProductAvailabilityBadge } from "@/components/catalog/product-availability-badge";
import { ProductSkuCopy } from "@/components/catalog/product-sku-copy";
import { ProductActions } from "@/components/shop/product-actions";
import { surfaceVariants } from "@/components/ui/surface";
import { productMediaFrameClassName } from "@/components/media/product-media-frame";
import { getProductHref, getProductImageAlt } from "@/lib/catalog/helpers";
import { getShopProductSnapshot } from "@/lib/shop/product";
import { formatAttributeValue, formatProductPrice } from "@/lib/utils/price";
import { cn } from "@/lib/utils";
import { ProductCardMedia } from "@/components/catalog/product-card-media";

import type { Category, Product } from "@/types/catalog";

type ProductCardTag = {
	id: string;
	label: string;
};

const PRODUCT_CARD_TAG_LIMIT = 4;
const ATTRIBUTE_TAG_EXCLUDED_KEYS = new Set(["warranty", "countryoforigin"]);
const FINISH_ATTRIBUTE_KEYS = new Set([
	"color",
	"colour",
	"finish",
	"material",
	"surface",
	"coating",
]);
const DIMENSION_ATTRIBUTE_KEYS = ["widthmm", "heightmm", "depthmm", "lengthmm"];
const SPECIFICATION_ATTRIBUTE_KEYS = new Set([
	"size",
	"dimensions",
	"diameter",
	"diametermm",
	"power",
	"powerw",
	"mounting",
	"installation",
	"shape",
	"type",
]);
const UNIT_LABELS: Record<string, string> = {
	mm: "мм",
	W: "Вт",
};

function normalizeAttributeKey(key: string) {
	return key.trim().toLocaleLowerCase("en-US");
}

function isDimensionAttribute(attribute: Product["attributes"][number]) {
	const normalizedKey = normalizeAttributeKey(attribute.key);

	return (
		DIMENSION_ATTRIBUTE_KEYS.includes(normalizedKey) ||
		["diameter", "diametermm"].includes(normalizedKey)
	);
}

function getUnitLabel(unit?: string) {
	return unit ? (UNIT_LABELS[unit] ?? unit) : null;
}

function createAttributeTag(
	attribute: Product["attributes"][number],
): ProductCardTag {
	return {
		id: `${attribute.key}-${String(attribute.value)}`,
		label: formatAttributeValue(attribute),
	};
}

function getDimensionTag(
	attributes: Product["attributes"],
): ProductCardTag | null {
	const attributesByKey = new Map(
		attributes.map((attribute) => [
			normalizeAttributeKey(attribute.key),
			attribute,
		]),
	);
	const dimensions = DIMENSION_ATTRIBUTE_KEYS.map((key) =>
		attributesByKey.get(key),
	).filter((attribute): attribute is Product["attributes"][number] =>
		Boolean(attribute),
	);

	if (dimensions.length >= 2) {
		const sharedUnit = dimensions.every(
			(attribute) => attribute.unit === dimensions[0]?.unit,
		)
			? getUnitLabel(dimensions[0]?.unit)
			: null;
		const dimensionLabel = sharedUnit
			? `${dimensions.map((attribute) => String(attribute.value)).join(" x ")} ${sharedUnit}`
			: dimensions.map(formatAttributeValue).join(" x ");

		return {
			id: dimensions.map((attribute) => attribute.key).join("-"),
			label: dimensionLabel,
		};
	}

	const diameter = attributes.find((attribute) =>
		["diameter", "diametermm"].includes(normalizeAttributeKey(attribute.key)),
	);

	return diameter ? createAttributeTag(diameter) : null;
}

function addUniqueTag(
	tags: ProductCardTag[],
	seenTagIds: Set<string>,
	tag: ProductCardTag | null,
) {
	if (!tag || seenTagIds.has(tag.id) || tags.length >= PRODUCT_CARD_TAG_LIMIT) {
		return;
	}

	tags.push(tag);
	seenTagIds.add(tag.id);
}

function getProductCardTags(
	product: Product,
	category?: Category | null,
): ProductCardTag[] {
	const tags: ProductCardTag[] = [];
	const seenTagIds = new Set<string>();
	const availableAttributes = product.attributes.filter(
		(attribute) =>
			!ATTRIBUTE_TAG_EXCLUDED_KEYS.has(normalizeAttributeKey(attribute.key)),
	);
	const dimensionTag = getDimensionTag(availableAttributes);
	const hasDimensionTag = Boolean(dimensionTag);

	if (category) {
		addUniqueTag(tags, seenTagIds, {
			id: `category-${category.key}`,
			label: category.name,
		});
	}

	availableAttributes
		.filter((attribute) =>
			FINISH_ATTRIBUTE_KEYS.has(normalizeAttributeKey(attribute.key)),
		)
		.slice(0, 2)
		.forEach((attribute) => {
			addUniqueTag(tags, seenTagIds, createAttributeTag(attribute));
		});

	addUniqueTag(tags, seenTagIds, dimensionTag);

	availableAttributes
		.filter(
			(attribute) =>
				SPECIFICATION_ATTRIBUTE_KEYS.has(
					normalizeAttributeKey(attribute.key),
				) && !(hasDimensionTag && isDimensionAttribute(attribute)),
		)
		.forEach((attribute) => {
			addUniqueTag(tags, seenTagIds, createAttributeTag(attribute));
		});

	availableAttributes.forEach((attribute) => {
		if (hasDimensionTag && isDimensionAttribute(attribute)) {
			return;
		}

		addUniqueTag(tags, seenTagIds, createAttributeTag(attribute));
	});

	return tags;
}

function ProductCardTags({ tags }: { tags: ProductCardTag[] }) {
	return (
		<div
			aria-label="Краткие характеристики товара"
			className="mt-3 flex min-h-[4.25rem] max-h-[4.25rem] flex-wrap content-start gap-1.5 overflow-hidden">
			{tags.map((tag) => (
				<Badge
					key={tag.id}
					size="sm"
					className="min-w-0 max-w-full border-hairline bg-canvas px-2.5 py-1 text-[11px] leading-tight text-ink-muted shadow-none">
					<span className="truncate">{tag.label}</span>
				</Badge>
			))}
		</div>
	);
}

export function ProductCard({
	category,
	product,
}: {
	category?: Category | null;
	product: Product;
}) {
	const imageAlt = getProductImageAlt(product);
	const href = getProductHref(product, category);
	const cardTags = getProductCardTags(product, category);
	const shopProduct = getShopProductSnapshot(product, category);

	return (
		<article
			className={cn(
				surfaceVariants({ variant: "card" }),
				"hover-lift-card group relative flex h-full min-w-0 flex-col overflow-hidden p-3 transition-colors duration-300 hover:border-hairline-strong",
			)}>
			<Link
				href={href}
				scroll={false}
				aria-label={`Открыть товар ${product.name}`}
				className="absolute inset-0 z-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			/>

			<div className="relative z-10">
				<ProductCardMedia
					href={href}
					images={product.images}
					alt={imageAlt}
				/>
			</div>

			<div className="pointer-events-none relative z-10 flex flex-1 flex-col px-2 pb-2 pt-4 sm:px-3">
				<div className="min-w-0">
					<p className="min-w-0 whitespace-normal break-words mb-2 text-[1.375rem] font-bold leading-tight tracking-normal text-ink sm:text-2xl">
						{formatProductPrice(product)}
					</p>
					<h2 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-ink">
						{product.name}
					</h2>
					<ProductAvailabilityBadge
						product={product}
						className="mt-3 min-h-7 w-fit px-2.5 py-1 text-[11px]"
					/>
					<ProductSkuCopy
						sku={product.sku}
						className="mt-3 max-w-full"
					/>
				</div>

				<ProductCardTags tags={cardTags} />

				<div className="mt-auto border-t border-hairline pt-3.5">
					<div className="space-y-3">
						<div className="pointer-events-auto relative z-20">
							<ProductActions
								layout="card"
								product={shopProduct}
							/>
						</div>
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
				"flex h-full min-w-0 flex-col overflow-hidden p-3",
			)}>
			<div className="relative">
				<div className={productMediaFrameClassName("card", "animate-pulse")} />
			</div>
			<div className="flex flex-1 flex-col px-2 pb-2 pt-4 sm:px-3">
				<div className="min-h-[2.75rem]">
					<div className="h-5 w-11/12 animate-pulse rounded-full bg-toolbar" />
					<div className="mt-2 h-5 w-3/5 animate-pulse rounded-full bg-toolbar" />
				</div>
				<div className="mt-3 h-7 w-24 animate-pulse rounded-full bg-toolbar" />

				<div className="mt-3 flex min-h-[4.25rem] flex-wrap content-start gap-1.5">
					<div className="h-6 w-20 animate-pulse rounded-full bg-toolbar" />
					<div className="h-6 w-24 animate-pulse rounded-full bg-toolbar" />
					<div className="h-6 w-16 animate-pulse rounded-full bg-toolbar" />
				</div>

				<div className="mt-auto border-t border-hairline pt-3.5">
					<div className="space-y-3">
						<div className="h-8 w-36 animate-pulse rounded-full bg-toolbar" />
						<div className="grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2.5">
							<div className="h-11 animate-pulse rounded-full bg-toolbar" />
							<div className="size-11 animate-pulse rounded-full bg-toolbar" />
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}
