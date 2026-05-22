"use client";

import { useEffect, useState } from "react";

import { surfaceVariants } from "@/components/ui/surface";
import { SHOP_TOAST_EVENT } from "@/lib/shop/store";
import { cn } from "@/lib/utils";

import type { ShopToast } from "@/types/shop";

type VisibleToast = Required<Pick<ShopToast, "id" | "title">> &
	Pick<ShopToast, "description">;

export function ShopToasts() {
	const [toasts, setToasts] = useState<VisibleToast[]>([]);

	useEffect(() => {
		const timers = new Map<string, number>();

		function removeToast(id: string) {
			setToasts((currentToasts) =>
				currentToasts.filter((toast) => toast.id !== id),
			);
		}

		function handleToast(event: Event) {
			const customEvent = event as CustomEvent<ShopToast>;
			const toast = customEvent.detail;

			if (!toast?.title) {
				return;
			}

			const id = toast.id ?? String(Date.now());

			setToasts((currentToasts) => [
				{
					id,
					title: toast.title,
					description: toast.description,
				},
				...currentToasts.filter((item) => item.id !== id),
			].slice(0, 3));

			const timeout = window.setTimeout(() => {
				removeToast(id);
				timers.delete(id);
			}, 3200);

			timers.set(id, timeout);
		}

		window.addEventListener(SHOP_TOAST_EVENT, handleToast);

		return () => {
			window.removeEventListener(SHOP_TOAST_EVENT, handleToast);
			timers.forEach((timeout) => {
				window.clearTimeout(timeout);
			});
		};
	}, []);

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div
			aria-live="polite"
			aria-atomic="true"
			className="fixed bottom-5 right-5 z-[70] grid w-[min(380px,calc(100vw-2rem))] gap-2">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={cn(surfaceVariants({ variant: "card" }), "p-4")}>
					<p className="text-sm font-semibold text-ink">{toast.title}</p>
					{toast.description ? (
						<p className="mt-1 line-clamp-2 text-sm text-ink-muted">
							{toast.description}
						</p>
					) : null}
				</div>
			))}
		</div>
	);
}
