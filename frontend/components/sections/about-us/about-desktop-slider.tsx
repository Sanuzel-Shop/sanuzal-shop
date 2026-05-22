"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
} from "lucide-react";

import type { AboutSubsection } from "@/types";
import { Button } from "@/components/ui/button";
import { AboutSlideDots } from "./about-slide-dots";
import { AboutSlideIndicator } from "./about-slide-indicator";

type AboutDesktopSliderProps = {
	activeIndex: number;
	activeSubsection: AboutSubsection;
	direction: number;
	prefersReducedMotion: boolean;
	slideCount: number;
	subsections: AboutSubsection[];
	titleId: string;
	onSelect: (index: number) => void;
	onPrevious: () => void;
	onNext: () => void;
};

export function AboutDesktopSlider({
	activeIndex,
	activeSubsection,
	direction,
	prefersReducedMotion,
	slideCount,
	subsections,
	titleId,
	onSelect,
	onPrevious,
	onNext,
}: AboutDesktopSliderProps) {
	return (
		<div className='mx-auto w-full max-w-5xl'>
			<div className='grid w-full grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_auto] items-center justify-center md:gap-12 lg:gap-16'>
				<div className='relative z-0 grid min-w-0 auto-rows-auto'>
					<AnimatePresence
						mode='wait'
						custom={direction}
						initial={false}>
						<motion.article
							key={activeSubsection.id}
							custom={direction}
							variants={{
								enter: (slideDirection: number) => ({
									opacity: 0,
									y: slideDirection > 0 ? 28 : -28,
								}),
								center: {
									opacity: 1,
									y: 0,
								},
								exit: (slideDirection: number) => ({
									opacity: 0,
									y: slideDirection > 0 ? -28 : 28,
								}),
							}}
							initial='enter'
							animate='center'
							exit='exit'
							transition={{
								duration: prefersReducedMotion ? 0 : 0.46,
								ease: [0.22, 1, 0.36, 1],
							}}
							className='col-start-1 row-start-1 flex min-w-0 flex-col'>
							<h2
								id={titleId}
								className='max-w-4xl text-2xl font-semibold leading-[0.98] tracking-normal text-ink sm:text-3xl lg:text-5xl'>
								{activeSubsection.title}
							</h2>

							<p className='mt-6 max-w-3xl text-sm text-ink-muted sm:mt-7 sm:text-base lg:text-lg'>
								{activeSubsection.body}
							</p>

							{activeSubsection.seo_keywords?.length ? (
								<div className='mt-7 flex max-w-3xl flex-wrap gap-2 sm:mt-8'>
									{activeSubsection.seo_keywords.map((keyword) => (
										<span
											key={`${activeSubsection.id}-${keyword}`}
											className='rounded-full border border-hairline-strong px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted sm:text-xs sm:tracking-[0.18em]'>
											{keyword}
										</span>
									))}
								</div>
							) : null}
						</motion.article>
					</AnimatePresence>
				</div>

				<div className='relative z-10 flex items-center justify-center gap-4 md:flex-col'>
					<AboutSlideIndicator
						activeIndex={activeIndex}
						slideCount={slideCount}
						prefersReducedMotion={prefersReducedMotion}
						align='center'
						hasBottomMargin={false}
					/>

					<nav
						aria-label='About section slides'
						className='flex w-fit items-center gap-3 rounded-full border border-hairline bg-frost p-2 shadow-surface-lg backdrop-blur md:flex-col md:px-3 md:py-2.5'>
						<Button
							type='button'
							variant='secondary'
							size='icon'
							aria-label='Show previous about slide'
							onClick={onPrevious}>
							<ChevronUp
								aria-hidden='true'
								className='h-4 w-4 hidden md:block'
							/>
							<ChevronLeft
								aria-hidden='true'
								className='h-4 w-4 md:hidden'
							/>
						</Button>
						<div className='flex md:flex-col items-center gap-2'>
							<AboutSlideDots
								activeIndex={activeIndex}
								subsections={subsections}
								onSelect={onSelect}
								orientation='horizontal'
							/>
						</div>
						<Button
							type='button'
							variant='secondary'
							size='icon'
							aria-label='Show next about slide'
							onClick={onNext}>
							<ChevronDown
								aria-hidden='true'
								className='h-4 w-4 hidden md:block'
							/>
							<ChevronRight
								aria-hidden='true'
								className='h-4 w-4 md:hidden'
							/>
						</Button>
					</nav>
				</div>
			</div>
		</div>
	);
}
