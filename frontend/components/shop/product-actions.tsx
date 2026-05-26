"use client";

import { Heart, Minus, Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useShopState } from "@/lib/shop/store";
import { cn } from "@/lib/utils";

import type { ShopProductSnapshot } from "@/types/shop";

type ProductActionLayout = "card" | "detail";

export function ProductCartControls({
	className,
	layout = "detail",
	product,
}: {
	className?: string;
	layout?: ProductActionLayout;
	product: ShopProductSnapshot;
}) {
	const {
		addToCart,
		decrementCartQuantity,
		getCartQuantity,
		hydrated,
		incrementCartQuantity,
	} = useShopState();
	const isCard = layout === "card";
	const quantity = hydrated ? getCartQuantity(product.id) : 0;

	if (quantity > 0) {
		return (
			<div
				className={cn(
					"grid shrink-0 items-center overflow-hidden rounded-full border border-hairline bg-frost text-ink shadow-none transition-colors duration-200 hover:border-hairline-strong",
					isCard
						? "h-11 w-full min-w-0 grid-cols-[2.625rem_minmax(2.5rem,1fr)_2.625rem]"
						: "h-12 min-w-[11rem] grid-cols-[3rem_minmax(2.5rem,1fr)_3rem]",
					className,
				)}>
				<button
					type="button"
					aria-label={`Уменьшить количество: ${product.name}`}
					className="flex h-full items-center justify-center text-ink-muted transition-colors duration-200 hover:bg-toolbar hover:text-ink active:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
					onClick={() => {
						decrementCartQuantity(product.id);
					}}>
					<Minus
						aria-hidden="true"
						className="size-4"
					/>
				</button>

				<span
					aria-live="polite"
					className="flex h-full items-center justify-center border-x border-hairline bg-canvas/70 px-2 text-sm font-semibold tabular-nums leading-none text-ink">
					{quantity}
				</span>

				<button
					type="button"
					aria-label={`Увеличить количество: ${product.name}`}
					className="flex h-full items-center justify-center text-ink-muted transition-colors duration-200 hover:bg-toolbar hover:text-ink active:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
					onClick={() => {
						incrementCartQuantity(product);
					}}>
					<Plus
						aria-hidden="true"
						className="size-4"
					/>
				</button>
			</div>
		);
	}

	return (
		<Button
			type="button"
			variant="dark"
			size={isCard ? "sm" : "default"}
			className={cn(
				"w-full min-w-0",
				isCard && "h-11 min-h-11 px-4 text-sm shadow-control",
				className,
			)}
			onClick={() => {
				addToCart(product);
			}}>
			<ShoppingBag aria-hidden="true" />
			В корзину
		</Button>
	);
}

export function ProductFavoriteButton({
	className,
	compact = false,
	product,
}: {
	className?: string;
	compact?: boolean;
	product: ShopProductSnapshot;
}) {
	const { hydrated, isFavorite, toggleFavorite } = useShopState();
	const favorite = hydrated && isFavorite(product.id);

	return (
		<Button
			type="button"
			variant={favorite ? "favorite" : "secondary"}
			size={compact ? "icon" : "default"}
			className={cn(
				compact
					&& "size-11 border-hairline bg-frost text-ink-muted shadow-none hover:border-hairline-strong hover:bg-toolbar hover:text-ink hover:shadow-control active:bg-canvas",
				compact
					&& favorite
					&& "border-destructive/25 bg-canvas text-destructive hover:border-destructive/35 hover:bg-frost hover:text-destructive",
				className,
			)}
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
			{compact ? null : favorite ? "В избранном" : "В избранное"}
		</Button>
	);
}

export function ProductActions({
	className,
	layout = "detail",
	product,
}: {
	className?: string;
	layout?: ProductActionLayout;
	product: ShopProductSnapshot;
}) {
	const isCard = layout === "card";

	return (
		<div
			className={cn(
				"grid",
				isCard
					? "grid-cols-[minmax(0,1fr)_2.75rem] items-stretch gap-2.5"
					: "gap-2 sm:grid-cols-[minmax(0,1fr)_auto]",
				className,
			)}>
			<ProductCartControls
				className={isCard ? "min-w-0" : undefined}
				layout={layout}
				product={product}
			/>

			<ProductFavoriteButton
				compact={isCard}
				product={product}
			/>
		</div>
	);
}
