import { cva } from "class-variance-authority";

export const surfaceVariants = cva("border border-hairline", {
	variants: {
		variant: {
			card: "rounded-md bg-canvas shadow-control",
			muted: "rounded-md bg-frost shadow-control",
			media: "rounded-sm bg-toolbar",
			empty:
				"rounded-md border-dashed border-hairline-strong bg-frost text-center",
		},
	},
	defaultVariants: {
		variant: "card",
	},
});
