"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ProductBackButton({
	fallbackHref,
}: {
	fallbackHref: string;
}) {
	const router = useRouter();

	function handleBack() {
		if (window.history.length > 1) {
			router.back();
			return;
		}

		router.push(fallbackHref);
	}

	return (
		<Button
			type="button"
			variant="secondary"
			size="sm"
			aria-label="Вернуться на предыдущую страницу"
			onClick={handleBack}>
			<ChevronLeft
				aria-hidden="true"
				className="size-4"
			/>
			Назад
		</Button>
	);
}
