"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { surfaceVariants } from "@/components/ui/surface";
import { useShopState } from "@/lib/shop/store";
import { cn } from "@/lib/utils";

type OpenPanel = "cart" | "favorites" | null;

function CounterBadge({ count }: { count: number }) {
	if (count <= 0) {
		return null;
	}

	return (
		<span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full border border-canvas bg-ink px-1 text-[10px] font-semibold leading-4 text-on-dark">
			{count > 99 ? "99+" : count}
		</span>
	);
}

export function HeaderShopActions() {
	const { cartCount, favoritesCount, state } = useShopState();
	const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
	const isCartOpen = openPanel === "cart";
	const isFavoritesOpen = openPanel === "favorites";
	const panelItems = isCartOpen
		? state.cart.map((line) => line.product)
		: state.favorites;
	const favoritesButtonVariant = favoritesCount > 0
		? "favorite"
		: isFavoritesOpen
			? "dark"
			: "secondary";
	const panelTitle = isCartOpen ? "Корзина" : "Избранное";
	const emptyText = isCartOpen
		? "Корзина пока пуста"
		: "В избранном пока нет товаров";

	useEffect(() => {
		if (!openPanel) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpenPanel(null);
			}
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [openPanel]);

	return (
		<div className="relative flex items-center justify-end gap-2 md:gap-3">
			<div className="relative">
				<Button
					type="button"
					variant={favoritesButtonVariant}
					size="icon"
					aria-label={`Избранное, товаров: ${favoritesCount}`}
					aria-expanded={isFavoritesOpen}
					onClick={() => {
						setOpenPanel(isFavoritesOpen ? null : "favorites");
					}}>
					<Heart
						aria-hidden="true"
						className={cn(favoritesCount > 0 && "fill-current")}
					/>
				</Button>
				<CounterBadge count={favoritesCount} />
			</div>

			<div className="relative">
				<Button
					type="button"
					variant={isCartOpen ? "dark" : "secondary"}
					size="icon"
					aria-label={`Корзина, товаров: ${cartCount}`}
					aria-expanded={isCartOpen}
					onClick={() => {
						setOpenPanel(isCartOpen ? null : "cart");
					}}>
					<ShoppingBag aria-hidden="true" />
				</Button>
				<CounterBadge count={cartCount} />
			</div>

			{openPanel ? (
				<div
					className={cn(
						surfaceVariants({ variant: "card" }),
						"absolute right-0 top-12 w-[min(340px,calc(100vw-2rem))] p-4",
					)}>
					<div className="flex items-baseline justify-between gap-4">
						<p className="text-sm font-semibold text-ink">{panelTitle}</p>
						<p className="text-xs text-ink-faint">
							{isCartOpen ? cartCount : favoritesCount}
						</p>
					</div>

					{panelItems.length > 0 ? (
						<ul className="mt-3 grid gap-2">
							{panelItems.slice(0, 4).map((product) => (
								<li key={product.id}>
									<Link
										href={product.href}
										onClick={() => {
											setOpenPanel(null);
										}}
										className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-sm border border-hairline bg-frost p-2">
										<span
											role="img"
											aria-label={product.name}
											className="aspect-square rounded-sm bg-toolbar bg-contain bg-center bg-no-repeat"
											style={{ backgroundImage: `url(${product.image})` }}
										/>
										<span className="min-w-0">
											<span className="line-clamp-2 text-xs font-semibold text-ink">
												{product.name}
											</span>
											<span className="mt-1 block text-xs text-ink-muted">
												{product.priceLabel}
											</span>
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-3 rounded-sm border border-dashed border-hairline-strong bg-frost px-3 py-4 text-center text-sm text-ink-muted">
							{emptyText}
						</p>
					)}
				</div>
			) : null}
		</div>
	);
}
