"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { FilledImage } from "@/components/media/filled-image";
import {
	getSafeProductImageSrc,
	productMediaFrameClassName,
} from "@/components/media/product-media-frame";
import { cn } from "@/lib/utils";

import type { ProductImage } from "@/types/catalog";

type ProductCardMediaProps = {
	href: string;
	images: ProductImage[];
	alt: string;
	className?: string;
};

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function normalizeImages(images: ProductImage[], alt: string) {
	const normalized = images
		.map((image) => ({
			url: image.url.trim(),
			alt: image.alt?.trim() ? image.alt : alt,
		}))
		.filter((image) => image.url.trim().length > 0);

	return normalized.length > 0 ? normalized.slice(0, 5) : [{ url: "/no-image.png", alt }];
}

export function ProductCardMedia({
	href,
	images,
	alt,
	className,
}: ProductCardMediaProps) {
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const isDraggingRef = useRef(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const gallery = useMemo(() => normalizeImages(images, alt), [images, alt]);

	const setIndexFromClientX = useCallback(
		(clientX: number) => {
			const node = containerRef.current;
			if (!node) return;

			const rect = node.getBoundingClientRect();
			const progress = (clientX - rect.left) / Math.max(1, rect.width);
			const index = clamp(Math.floor(progress * gallery.length), 0, gallery.length - 1);

			setActiveIndex((prev) => (prev === index ? prev : index));
		},
		[gallery.length],
	);

	const scheduleMove = useCallback(
		(clientX: number) => {
			if (rafRef.current !== null) {
				window.cancelAnimationFrame(rafRef.current);
			}

			rafRef.current = window.requestAnimationFrame(() => {
				rafRef.current = null;
				setIndexFromClientX(clientX);
			});
		},
		[setIndexFromClientX],
	);

	return (
		<div
			ref={containerRef}
			className={productMediaFrameClassName(
				"card",
				cn("group cursor-pointer select-none", className),
			)}
			onPointerMove={(event) => {
				if (gallery.length <= 1) return;
				scheduleMove(event.clientX);
			}}
			onPointerLeave={() => {
				setActiveIndex(0);
				isDraggingRef.current = false;
			}}
			onPointerDown={(event) => {
				if (gallery.length <= 1) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				isDraggingRef.current = true;
				scheduleMove(event.clientX);
			}}
			onPointerUp={(event) => {
				if (gallery.length > 1) {
					event.currentTarget.releasePointerCapture(event.pointerId);
				}
				// Standard click routing (ignoring heavy drag selections)
				if (isDraggingRef.current) {
					router.push(href, { scroll: false });
				}
				isDraggingRef.current = false;
			}}
			onClick={() => {
				// Fallback navigation handler
				router.push(href, { scroll: false });
			}}
			role="link"
			aria-label="Открыть товар"
			tabIndex={0}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					router.push(href, { scroll: false });
				}
			}}>
			<FilledImage
				src={getSafeProductImageSrc(gallery[activeIndex]?.url)}
				alt={gallery[activeIndex]?.alt ?? alt}
				sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
				className="absolute inset-0"
			/>

			{gallery.length > 1 ? (
				<div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
					{gallery.map((_, index) => (
						<span
							key={index}
							aria-hidden="true"
							className={cn(
								"h-1.5 rounded-full transition-all duration-300 ease-out",
								index === activeIndex 
									? "bg-gray-500 w-5" 
									: "bg-gray-300 w-1.5 hover:bg-black"
							)}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}
