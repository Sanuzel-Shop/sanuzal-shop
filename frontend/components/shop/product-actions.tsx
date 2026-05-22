"use client";

import { Check, Heart, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShopState } from "@/lib/shop/store";
import { cn } from "@/lib/utils";

import type { ShopProductSnapshot } from "@/types/shop";

export function ProductActions({
	layout = "detail",
	product,
}: {
	layout?: "card" | "detail";
	product: ShopProductSnapshot;
}) {
	const {
		addToCart,
		hydrated,
		isFavorite,
		isInCart,
		toggleFavorite,
	} = useShopState();
	const inCart = hydrated && isInCart(product.id);
	const favorite = hydrated && isFavorite(product.id);
	const isCard = layout === "card";

	return (
		<div
			className={cn(
				"grid gap-2",
				!isCard && "sm:grid-cols-[minmax(0,1fr)_auto]",
			)}>
			<Button
				type="button"
				variant={inCart ? "dark" : "secondary"}
				size={isCard ? "sm" : "default"}
				className="w-full"
				onClick={() => {
					addToCart(product);
				}}>
				{inCart ? (
					<Check aria-hidden="true" />
				) : (
					<ShoppingBag aria-hidden="true" />
				)}
				{inCart ? "В корзине" : "В корзину"}
			</Button>

			{!isCard ? (
				<Button
					type="button"
					variant={favorite ? "favorite" : "secondary"}
					size="default"
					aria-label={
						favorite
							? `Удалить из избранного: ${product.name}`
							: `Добавить в избранное: ${product.name}`
					}
					aria-pressed={favorite}
					onClick={() => {
						toggleFavorite(product);
					}}>
					<Heart
						aria-hidden="true"
						className={cn(favorite && "fill-current")}
					/>
					{favorite ? "В избранном" : "В избранное"}
				</Button>
			) : null}
		</div>
	);
}
