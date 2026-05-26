"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type FilledImageProps = {
	src: string;
	alt: string;
	sizes?: string;
	className?: string;
	priority?: boolean;
};

export function FilledImage({
	src,
	alt,
	sizes,
	className,
	priority,
}: FilledImageProps) {
	const [isLoaded, setIsLoaded] = useState(false);
	const safeAlt = alt?.trim() ? alt : "Изображение товара";

	const markLoaded = useCallback(() => {
		setIsLoaded(true);
	}, []);

	useEffect(() => {
		setIsLoaded(false);
	}, [src]);

	return (
		<div
			className={cn(
				"relative h-full w-full overflow-hidden bg-toolbar",
				className,
			)}>
			<Image
				src={src}
				alt=""
				fill
				priority={priority}
				sizes={sizes}
				aria-hidden="true"
				className={cn(
					"pointer-events-none select-none object-cover",
					"scale-[1.08] blur-2xl opacity-40",
					"transition-opacity duration-300 ease-out",
					isLoaded ? "opacity-40" : "opacity-0",
				)}
				onLoad={markLoaded}
				onError={markLoaded}
			/>

			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_25%,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_62%)]"
			/>

			<Image
				src={src}
				alt={safeAlt}
				fill
				priority={priority}
				sizes={sizes}
				className={cn(
					"select-none object-contain",
					"transition-opacity duration-300 ease-out",
					isLoaded ? "opacity-100" : "opacity-0",
				)}
				onLoad={markLoaded}
				onError={markLoaded}
			/>

			{!isLoaded ? (
				<div
					aria-hidden="true"
					className="absolute inset-0 animate-pulse bg-toolbar"
				/>
			) : null}
		</div>
	);
}
