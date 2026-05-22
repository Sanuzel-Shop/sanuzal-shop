import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"btn-motion inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold tracking-normal shadow-control hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 hover:shadow-control",
	{
		variants: {
			variant: {
				primary:
					"border-canvas bg-canvas text-ink hover:border-frost hover:bg-frost",
				secondary:
					"border-hairline bg-frost text-ink shadow-none hover:border-hairline-strong hover:bg-toolbar hover:shadow-control",
				dark:
					"border-ink bg-ink text-on-dark hover:border-ink-muted hover:bg-ink-muted",
				favorite:
					"border-hairline bg-canvas text-destructive hover:border-hairline-strong hover:bg-frost",
			},
			size: {
				default: "min-h-12 px-6 py-3",
				sm: "min-h-9 px-4 py-2 text-xs",
				icon: "size-9 p-0",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
