"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

function scrollToPageTop() {
	document.documentElement.scrollTop = 0;
	document.body.scrollTop = 0;
	window.scrollTo({
		left: 0,
		top: 0,
		behavior: "auto",
	});
}

export function ProductScrollToTop() {
	const pathname = usePathname();

	useLayoutEffect(() => {
		const previousScrollRestoration = window.history.scrollRestoration;
		let secondFrameId = 0;

		window.history.scrollRestoration = "manual";
		scrollToPageTop();

		const firstFrameId = window.requestAnimationFrame(() => {
			scrollToPageTop();

			secondFrameId = window.requestAnimationFrame(scrollToPageTop);
		});
		const timeoutId = window.setTimeout(scrollToPageTop, 160);

		return () => {
			window.cancelAnimationFrame(firstFrameId);

			if (secondFrameId) {
				window.cancelAnimationFrame(secondFrameId);
			}

			window.clearTimeout(timeoutId);
			window.history.scrollRestoration = previousScrollRestoration;
		};
	}, [pathname]);

	return null;
}
