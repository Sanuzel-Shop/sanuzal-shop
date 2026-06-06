import type { CartLine } from "@/types/shop";

export type BuyerType = "person" | "company";

export type CheckoutCustomer = {
	organizationSearch: string;
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	companyName: string;
	inn: string;
	kpp: string;
	ogrn: string;
	legalAddress: string;
	bik: string;
	bankName: string;
	correspondentAccount: string;
	checkingAccount: string;
};

export type CheckoutOrderPayload = {
	buyerType: BuyerType;
	customer: CheckoutCustomer;
	delivery: {
		country: string;
		region: string;
		city: string;
	};
	items: Array<{
		id: string;
		name: string;
		sku: string | null;
		href: string;
		quantity: number;
		priceLabel: string;
		lineTotalLabel: string;
	}>;
	comment: string;
	callBack: boolean;
	cartCount: number;
	subtotalLabel: string;
	hasRequestedPrice: boolean;
	pageUrl: string;
	website: string;
};

type SubmitOrderResult = {
	ok: boolean;
	id?: string;
	mode?: "email" | "email_failed" | "mock" | "saved";
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getResponseErrorMessage(data: unknown): string | null {
	if (!isRecord(data)) {
		return null;
	}

	if (typeof data.message === "string") {
		return data.message;
	}

	if (isRecord(data.error) && typeof data.error.message === "string") {
		return data.error.message;
	}

	return null;
}

async function readJsonResponse(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

export function mapCartLinesToOrderItems(
	lines: CartLine[],
	getLinePriceLabel: (line: CartLine) => string,
	getLineTotalLabel: (line: CartLine) => string,
): CheckoutOrderPayload["items"] {
	return lines.map((line) => ({
		id: line.product.id,
		name: line.product.name,
		sku: line.product.sku,
		href: line.product.href,
		quantity: line.quantity,
		priceLabel: getLinePriceLabel(line),
		lineTotalLabel: getLineTotalLabel(line),
	}));
}

export async function submitCheckoutOrder(
	payload: CheckoutOrderPayload,
): Promise<SubmitOrderResult> {
	let response: Response;

	try {
		response = await fetch("/api/orders/submit", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ data: payload }),
		});
	} catch {
		throw new Error("Не удалось подключиться к серверу заказов.");
	}

	const data = await readJsonResponse(response);

	if (!response.ok) {
		throw new Error(
			getResponseErrorMessage(data)
			|| "Не удалось отправить заказ. Попробуйте еще раз.",
		);
	}

	if (isRecord(data)) {
		return {
			ok: data.ok === true,
			id: typeof data.id === "string" ? data.id : undefined,
			mode:
				data.mode === "email"
				|| data.mode === "email_failed"
				|| data.mode === "mock"
				|| data.mode === "saved"
					? data.mode
					: undefined,
		};
	}

	return { ok: true };
}
