import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Product } from "@/types/catalog";

export function ProductAvailabilityBadge({
	className,
	product,
}: {
	className?: string;
	product: Pick<Product, "inStock">;
}) {
	return (
		<Badge className={cn("gap-2", className)}>
			<span
				className={cn(
					"size-2 rounded-full",
					product.inStock ? "bg-green-500" : "bg-destructive",
				)}
			/>
			{product.inStock ? "В наличии" : "Нет в наличии"}
		</Badge>
	);
}
