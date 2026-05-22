import {
	getProductHref,
	getProductPrimaryImage,
} from "@/lib/catalog/helpers";
import { formatProductPrice } from "@/lib/utils/price";

import type { Category, Product } from "@/types/catalog";
import type { ShopProductSnapshot } from "@/types/shop";

export function getShopProductSnapshot(
	product: Product,
	category?: Pick<Category, "slug"> | null,
): ShopProductSnapshot {
	return {
		id: product.id,
		name: product.name,
		sku: product.sku,
		href: getProductHref(product, category),
		image: getProductPrimaryImage(product),
		priceLabel: formatProductPrice(product),
	};
}
