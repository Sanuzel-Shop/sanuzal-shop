import { NextResponse } from "next/server";

const DEFAULT_STRAPI_API_URL = "https://humble-trust-72330340a8.strapiapp.com";
const ORDER_REQUEST_TIMEOUT_MS = 15000;

function normalizeApiUrl(value: string | undefined): string | null {
	const normalizedValue = value?.trim().replace(/\/+$/, "");

	if (!normalizedValue || normalizedValue.includes("api.example.com")) {
		return null;
	}

	return normalizedValue;
}

function getStrapiApiUrl(): string {
	return (
		normalizeApiUrl(process.env.STRAPI_API_URL)
		?? normalizeApiUrl(process.env.NEXT_PUBLIC_STRAPI_URL)
		?? normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL)
		?? DEFAULT_STRAPI_API_URL
	);
}

function getResponseErrorMessage(data: unknown): string | null {
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		return null;
	}

	if ("message" in data && typeof data.message === "string") {
		return data.message;
	}

	const error = "error" in data ? data.error : null;

	if (
		error
		&& typeof error === "object"
		&& !Array.isArray(error)
		&& "message" in error
		&& typeof error.message === "string"
	) {
		return error.message;
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

export async function POST(request: Request) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: { message: "Некорректные данные заказа." } },
			{ status: 400 },
		);
	}

	const apiUrl = getStrapiApiUrl();
	const headers = new Headers({
		"Content-Type": "application/json",
	});
	const origin = request.headers.get("origin");
	const userAgent = request.headers.get("user-agent");
	const forwardedFor = request.headers.get("x-forwarded-for");

	if (origin) {
		headers.set("Origin", origin);
	}

	if (userAgent) {
		headers.set("User-Agent", userAgent);
	}

	if (forwardedFor) {
		headers.set("X-Forwarded-For", forwardedFor);
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort();
	}, ORDER_REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(`${apiUrl}/api/orders/submit`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
			signal: controller.signal,
		});
		const data = await readJsonResponse(response);

		if (!response.ok) {
			return NextResponse.json(
				{
					error: {
						message:
							getResponseErrorMessage(data)
							|| "Не удалось отправить заказ. Попробуйте еще раз.",
					},
				},
				{ status: response.status },
			);
		}

		return NextResponse.json(data ?? { ok: true });
	} catch {
		return NextResponse.json(
			{
				error: {
					message:
						"Не удалось подключиться к серверу заказов. Попробуйте позже или свяжитесь с менеджером.",
				},
			},
			{ status: 502 },
		);
	} finally {
		clearTimeout(timeoutId);
	}
}
