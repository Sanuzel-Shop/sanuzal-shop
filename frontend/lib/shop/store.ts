"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
	CartLine,
	ShopProductSnapshot,
	ShopState,
	ShopToast,
} from "@/types/shop";

const SHOP_STORAGE_KEY = "leppa-shop-state-v1";
const SHOP_STATE_EVENT = "leppa-shop-state-change";
export const SHOP_TOAST_EVENT = "leppa-shop-toast";

const EMPTY_SHOP_STATE: ShopState = {
	cart: [],
	favorites: [],
};

function createToastId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isProductSnapshot(value: unknown): value is ShopProductSnapshot {
	if (!value || typeof value !== "object") {
		return false;
	}

	const product = value as Partial<ShopProductSnapshot>;

	return Boolean(
		product.id
			&& product.name
			&& product.href
			&& product.image
			&& product.priceLabel,
	);
}

function normalizeCartLine(value: unknown): CartLine | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const line = value as Partial<CartLine>;

	if (!isProductSnapshot(line.product)) {
		return null;
	}

	return {
		product: line.product,
		quantity:
			typeof line.quantity === "number" && line.quantity > 0
				? line.quantity
				: 1,
		addedAt:
			typeof line.addedAt === "number" && line.addedAt > 0
				? line.addedAt
				: Date.now(),
	};
}

function normalizeShopState(value: unknown): ShopState {
	if (!value || typeof value !== "object") {
		return EMPTY_SHOP_STATE;
	}

	const state = value as Partial<ShopState>;

	return {
		cart: Array.isArray(state.cart)
			? state.cart
				.map(normalizeCartLine)
				.filter((line): line is CartLine => Boolean(line))
			: [],
		favorites: Array.isArray(state.favorites)
			? state.favorites.filter(isProductSnapshot)
			: [],
	};
}

function readShopState(): ShopState {
	if (typeof window === "undefined") {
		return EMPTY_SHOP_STATE;
	}

	try {
		const rawState = window.localStorage.getItem(SHOP_STORAGE_KEY);

		return rawState
			? normalizeShopState(JSON.parse(rawState))
			: EMPTY_SHOP_STATE;
	} catch {
		return EMPTY_SHOP_STATE;
	}
}

function writeShopState(nextState: ShopState) {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(nextState));
	window.dispatchEvent(
		new CustomEvent<ShopState>(SHOP_STATE_EVENT, { detail: nextState }),
	);
}

export function emitShopToast(toast: ShopToast) {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(
		new CustomEvent<ShopToast>(SHOP_TOAST_EVENT, {
			detail: {
				...toast,
				id: toast.id ?? createToastId(),
			},
		}),
	);
}

export function useShopState() {
	const [state, setState] = useState<ShopState>(EMPTY_SHOP_STATE);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		function syncState(nextState = readShopState()) {
			setState(nextState);
			setHydrated(true);
		}

		function handleStateChange(event: Event) {
			const customEvent = event as CustomEvent<ShopState>;

			syncState(normalizeShopState(customEvent.detail));
		}

		function handleStorageChange(event: StorageEvent) {
			if (event.key === SHOP_STORAGE_KEY) {
				syncState();
			}
		}

		syncState();

		window.addEventListener(SHOP_STATE_EVENT, handleStateChange);
		window.addEventListener("storage", handleStorageChange);

		return () => {
			window.removeEventListener(SHOP_STATE_EVENT, handleStateChange);
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	const cartIds = useMemo(
		() => new Set(state.cart.map((line) => line.product.id)),
		[state.cart],
	);
	const favoriteIds = useMemo(
		() => new Set(state.favorites.map((product) => product.id)),
		[state.favorites],
	);

	const addToCart = useCallback((product: ShopProductSnapshot) => {
		const currentState = readShopState();
		const alreadyInCart = currentState.cart.some(
			(line) => line.product.id === product.id,
		);

		if (alreadyInCart) {
			emitShopToast({
				title: "Товар уже в корзине",
				description: product.name,
			});

			return "exists" as const;
		}

		writeShopState({
			...currentState,
			cart: [
				{
					product,
					quantity: 1,
					addedAt: Date.now(),
				},
				...currentState.cart,
			],
		});
		emitShopToast({
			title: "Добавлено в корзину",
			description: product.name,
		});

		return "added" as const;
	}, []);

	const toggleFavorite = useCallback((product: ShopProductSnapshot) => {
		const currentState = readShopState();
		const isFavorite = currentState.favorites.some(
			(item) => item.id === product.id,
		);

		writeShopState({
			...currentState,
			favorites: isFavorite
				? currentState.favorites.filter((item) => item.id !== product.id)
				: [product, ...currentState.favorites],
		});
		emitShopToast({
			title: isFavorite ? "Удалено из избранного" : "Добавлено в избранное",
			description: product.name,
		});

		return isFavorite ? "removed" : "added";
	}, []);

	return {
		state,
		hydrated,
		cartCount: state.cart.reduce((total, line) => total + line.quantity, 0),
		favoritesCount: state.favorites.length,
		isInCart: useCallback(
			(productId: string) => cartIds.has(productId),
			[cartIds],
		),
		isFavorite: useCallback(
			(productId: string) => favoriteIds.has(productId),
			[favoriteIds],
		),
		addToCart,
		toggleFavorite,
	};
}
