import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
	label: string;
	href?: string;
};

export function StorefrontBreadcrumbs({
	className,
	items,
}: {
	className?: string;
	items: BreadcrumbItem[];
}) {
	return (
		<nav
			aria-label="Хлебные крошки"
			className={cn("min-w-0 text-sm text-ink-muted", className)}>
			<ol
				itemScope
				itemType="https://schema.org/BreadcrumbList"
				className="flex min-w-0 flex-wrap items-center gap-2">
				{items.map((item, index) => {
					const isLast = index === items.length - 1;

					return (
						<li
							key={`${item.label}-${index}`}
							itemProp="itemListElement"
							itemScope
							itemType="https://schema.org/ListItem"
							className="flex min-w-0 items-center gap-2">
							{index > 0 ? (
								<ChevronRight
									aria-hidden="true"
									className="h-3.5 w-3.5 shrink-0 text-ink-faint"
									strokeWidth={1.8}
								/>
							) : null}

							{item.href && !isLast ? (
								<Link
									href={item.href}
									itemProp="item"
									className="font-medium text-ink-muted hover:text-ink">
									<span itemProp="name">{item.label}</span>
								</Link>
							) : (
								<span
									itemProp="name"
									aria-current={isLast ? "page" : undefined}
									className="min-w-0 truncate text-ink-faint">
									{item.label}
								</span>
							)}
							<meta
								itemProp="position"
								content={String(index + 1)}
							/>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
