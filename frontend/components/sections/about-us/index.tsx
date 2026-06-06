"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { AboutDesktopSlider } from "./about-desktop-slider";

import contentBlocks from "@/data/about-us.json";

type AboutSubsection = {
	id: string;
	title: string;
	body: string;
	seo_keywords?: string[];
	order: number;
};

export const aboutSubsections = [...(contentBlocks as AboutSubsection[])].sort(
	(a, b) => a.order - b.order,
);

const clampIndex = (value: number, maxIndex: number) => {
	return Math.min(Math.max(value, 0), Math.max(maxIndex, 0));
};

const isDesktopViewport = () => {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(min-width: 768px)").matches
	);
};

export function AboutUsSection() {
	const sectionRef = useRef<HTMLElement | null>(null);
	const activeIndexRef = useRef(0);
	const mobileSlideScrollFrameRef = useRef<number | null>(null);

	const prefersReducedMotion = Boolean(useReducedMotion());

	const [activeIndex, setActiveIndex] = useState(0);
	const [direction, setDirection] = useState(1);

	const slideCount = aboutSubsections.length;
	const activeSubsection = aboutSubsections[activeIndex];

	useEffect(() => {
		activeIndexRef.current = activeIndex;
	}, [activeIndex]);

	const scrollMobileSlideStartIntoView = useCallback(
		(behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth") => {
			const section = sectionRef.current;

			if (!section || typeof window === "undefined" || isDesktopViewport()) {
				return;
			}

			const targetScrollTop =
				section.getBoundingClientRect().top + window.scrollY - 50;

			window.scrollTo({
				top: Math.max(targetScrollTop, 0),
				behavior,
			});
		},
		[prefersReducedMotion],
	);

	const queueMobileSlideStartScroll = useCallback(
		(behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth") => {
			if (typeof window === "undefined" || isDesktopViewport()) {
				return;
			}

			if (mobileSlideScrollFrameRef.current !== null) {
				window.cancelAnimationFrame(mobileSlideScrollFrameRef.current);
			}

			mobileSlideScrollFrameRef.current = window.requestAnimationFrame(() => {
				mobileSlideScrollFrameRef.current = null;
				scrollMobileSlideStartIntoView(behavior);
			});
		},
		[prefersReducedMotion, scrollMobileSlideStartIntoView],
	);

	const selectDesktopSlide = useCallback(
		(nextIndex: number) => {
			const safeIndex = clampIndex(nextIndex, slideCount - 1);
			const currentIndex = activeIndexRef.current;
			const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

			if (safeIndex === currentIndex) {
				queueMobileSlideStartScroll(behavior);
				return;
			}

			setDirection(safeIndex > currentIndex ? 1 : -1);
			activeIndexRef.current = safeIndex;
			setActiveIndex(safeIndex);
			queueMobileSlideStartScroll(behavior);
		},
		[prefersReducedMotion, queueMobileSlideStartScroll, slideCount],
	);

	const navigateDesktopSlide = useCallback(
		(step: 1 | -1) => {
			const currentIndex = activeIndexRef.current;
			const nextIndex =
				(currentIndex + step + slideCount) % Math.max(slideCount, 1);
			const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

			setDirection(step);
			activeIndexRef.current = nextIndex;
			setActiveIndex(nextIndex);
			queueMobileSlideStartScroll(behavior);
		},
		[prefersReducedMotion, queueMobileSlideStartScroll, slideCount],
	);

	useEffect(() => {
		return () => {
			if (
				typeof window !== "undefined" &&
				mobileSlideScrollFrameRef.current !== null
			) {
				window.cancelAnimationFrame(mobileSlideScrollFrameRef.current);
			}
		};
	}, []);

	if (!activeSubsection) {
		return null;
	}

	return (
		<section
			ref={sectionRef}
			id="about"
			aria-labelledby="about-title"
			className="relative bg-canvas text-ink">
			<div className="relative border-y border-hairline bg-canvas px-5 py-14 sm:px-8 sm:py-16 lg:px-14 lg:py-20 md:overflow-hidden">
				<AboutDesktopSlider
					activeIndex={activeIndex}
					activeSubsection={activeSubsection}
					direction={direction}
					prefersReducedMotion={prefersReducedMotion}
					slideCount={slideCount}
					subsections={aboutSubsections}
					titleId="about-title"
					onSelect={selectDesktopSlide}
					onPrevious={() => navigateDesktopSlide(-1)}
					onNext={() => navigateDesktopSlide(1)}
				/>
			</div>
		</section>
	);
}
