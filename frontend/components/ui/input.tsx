import * as React from "react";

import { cn } from "@/lib/utils";

export const fieldControlClassName =
	"min-h-12 w-full rounded-full border border-hairline bg-canvas px-4 text-sm text-ink shadow-control outline-none placeholder:text-ink-faint focus-visible:border-hairline-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, ...props }, ref) => {
		return (
			<input
				ref={ref}
				className={cn(fieldControlClassName, className)}
				{...props}
			/>
		);
	},
);
Input.displayName = "Input";

export { Input };
