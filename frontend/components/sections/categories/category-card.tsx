"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import type { Category } from "@/types";

const DESCRIPTION_COLLAPSED_LINES = 3;
const DESCRIPTION_COLLAPSED_FALLBACK_HEIGHT = "4.875em";

export function CategoryCard({
	category,
}: {
	category: Category;
}) {
	const imageSrc = category.image || "/no-image.png";
	const descriptionId = useId();
	const descriptionRef = useRef<HTMLParagraphElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [canExpand, setCanExpand] = useState(false);
	const [descriptionHeight, setDescriptionHeight] = useState({
		collapsed: 0,
		full: 0,
		measured: false,
	});

	useEffect(() => {
		const description = descriptionRef.current;

		if (!description) {
			return;
		}

		const descriptionElement = description;
		let isActive = true;

		function updateDescriptionHeight() {
			if (!isActive) {
				return;
			}

			const computedStyle = window.getComputedStyle(descriptionElement);
			const fontSize = Number.parseFloat(computedStyle.fontSize);
			const lineHeight = Number.parseFloat(computedStyle.lineHeight);
			const resolvedLineHeight = Number.isFinite(lineHeight)
				? lineHeight
				: fontSize * 1.625;
			const collapsedHeight = Math.ceil(
				resolvedLineHeight * DESCRIPTION_COLLAPSED_LINES,
			);
			const fullHeight = Math.ceil(descriptionElement.scrollHeight);
			const nextCanExpand = fullHeight > collapsedHeight + 2;

			setCanExpand(nextCanExpand);
			setDescriptionHeight((currentHeight) => {
				if (
					currentHeight.collapsed === collapsedHeight &&
					currentHeight.full === fullHeight &&
					currentHeight.measured
				) {
					return currentHeight;
				}

				return {
					collapsed: collapsedHeight,
					full: fullHeight,
					measured: true,
				};
			});

			if (!nextCanExpand) {
				setIsExpanded(false);
			}
		}

		updateDescriptionHeight();

		const resizeObserver = new ResizeObserver(updateDescriptionHeight);
		resizeObserver.observe(descriptionElement);
		window.addEventListener("resize", updateDescriptionHeight);
		document.fonts?.ready.then(() => {
			updateDescriptionHeight();
		});

		return () => {
			isActive = false;
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateDescriptionHeight);
		};
	}, [category.description]);

	const descriptionMaxHeight = descriptionHeight.measured
		? canExpand
			? `${isExpanded ? descriptionHeight.full : descriptionHeight.collapsed}px`
			: undefined
		: DESCRIPTION_COLLAPSED_FALLBACK_HEIGHT;

	return (
		<article className="group hover-lift-card relative flex h-full min-w-0 flex-col rounded-md border border-hairline bg-canvas p-3 shadow-control">
			<Link
				href={`/catalog/${category.slug}`}
				aria-label={`Открыть категорию ${category.name}`}
				className="absolute inset-0 z-10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
				<span className="sr-only">Открыть категорию {category.name}</span>
			</Link>

			<div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-hairline sm:aspect-[16/11]">
				<div
					aria-label={category.name}
					role="img"
					className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
					style={{ backgroundImage: `url(${imageSrc})` }}
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
			</div>

			<div className="flex flex-1 flex-col px-2 pb-2 pt-5">
				<div className="flex items-start justify-between gap-4">
					<h3 className="line-clamp-2 min-w-0 break-words text-2xl font-semibold leading-tight tracking-normal text-ink sm:text-[28px]">
						{category.name}
					</h3>

					<span
						className={cn(
							buttonVariants({ variant: "secondary", size: "icon" }),
							"pointer-events-none shrink-0 group-hover:-translate-y-0.5 group-hover:border-hairline-strong group-hover:bg-toolbar group-hover:shadow-control",
						)}>
						<ArrowUpRight
							aria-hidden="true"
							className="h-5 w-5"
							strokeWidth={1.8}
						/>
					</span>
				</div>

				<div
					id={descriptionId}
					className="mt-4 overflow-hidden transition-[max-height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
					style={{ maxHeight: descriptionMaxHeight }}>
					<p
						ref={descriptionRef}
						className="break-words text-sm leading-relaxed text-ink-muted sm:text-base">
						{category.description}
					</p>
				</div>

				{canExpand ? (
					<button
						type="button"
						aria-controls={descriptionId}
						aria-expanded={isExpanded}
						onClick={() => setIsExpanded((current) => !current)}
						className="relative z-20 mt-3 inline-flex w-fit items-center gap-1.5 rounded-full text-xs font-semibold text-ink-muted transition-colors duration-300 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
						<span>{isExpanded ? "Свернуть" : "Читать далее"}</span>
						<ChevronDown
							aria-hidden="true"
							className={cn(
								"h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
								isExpanded && "rotate-180",
							)}
							strokeWidth={1.8}
						/>
					</button>
				) : null}
			</div>
		</article>
	);
}
