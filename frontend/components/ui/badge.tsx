import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border font-medium tracking-normal",
	{
		variants: {
			variant: {
				muted: "border-hairline bg-frost text-ink-muted",
				dark: "border-ink bg-ink text-on-dark",
			},
			size: {
				sm: "px-2.5 py-1 text-xs",
				default: "px-3 py-1 text-xs",
			},
		},
		defaultVariants: {
			variant: "muted",
			size: "default",
		},
	},
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
	VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
	return (
		<span
			className={cn(badgeVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { badgeVariants };
