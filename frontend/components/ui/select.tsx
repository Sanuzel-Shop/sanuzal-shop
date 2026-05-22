import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { fieldControlClassName } from "@/components/ui/input";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, disabled, ...props }, ref) => {
		return (
			<span className="relative inline-flex w-full min-w-0">
				<select
					ref={ref}
					disabled={disabled}
					className={cn(
						fieldControlClassName,
						"min-h-12 appearance-none bg-canvas py-0 pl-5 pr-12 font-medium transition-colors hover:border-hairline-strong hover:bg-frost",
						className,
					)}
					{...props}
				/>
				<ChevronDown
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted transition-colors",
						disabled && "opacity-45",
					)}
				/>
			</span>
		);
	},
);
Select.displayName = "Select";

export { Select };
