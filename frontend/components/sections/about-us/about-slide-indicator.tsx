"use client";

import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

type AboutSlideIndicatorProps = {
  activeIndex: number;
  slideCount: number;
  prefersReducedMotion: boolean;
  align?: "start" | "center" | "end";
  className?: string;
  hasBottomMargin?: boolean;
};

const getAlignmentClass = (
  align: NonNullable<AboutSlideIndicatorProps["align"]>,
) => {
  if (align === "center") {
    return "justify-center";
  }

  return align === "start" ? "justify-start" : "justify-end";
};

export function AboutSlideIndicator({
  activeIndex,
  slideCount,
  prefersReducedMotion,
  align = "end",
  className,
  hasBottomMargin = true,
}: AboutSlideIndicatorProps) {
  const currentSlide = String(activeIndex + 1).padStart(2, "0");
  const totalSlides = String(slideCount).padStart(2, "0");

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        hasBottomMargin && "mb-5",
        "flex leading-none",
        getAlignmentClass(align),
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex flex-nowrap items-center whitespace-nowrap rounded-full border border-hairline bg-frost px-4 py-2.5 text-ink shadow-surface-md backdrop-blur md:flex-col md:py-3"
      >
        <span className="relative inline-flex justify-end overflow-hidden tabular-nums text-base font-semibold tracking-normal sm:text-lg">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={currentSlide}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.22,
                ease: "easeOut",
              }}
            >
              {currentSlide}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="hidden md:inline text-base font-medium text-ink-faint">
          —
        </span>

        <span className="md:hidden text-base font-medium text-ink-faint px-2">
          /
        </span>
        <span className="tabular-nums text-base font-semibold tracking-normal text-ink-soft sm:text-lg">
          {totalSlides}
        </span>
      </span>
    </div>
  );
}
