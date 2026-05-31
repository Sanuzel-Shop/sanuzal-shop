type RateLimitEntry = {
	count: number;
	resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(ctx): string {
	const forwardedFor = ctx.get("x-forwarded-for");

	if (forwardedFor) {
		return forwardedFor.split(",")[0]?.trim() || "unknown";
	}

	return ctx.ip || ctx.request.ip || "unknown";
}

function isRateLimited(key: string): boolean {
	const now = Date.now();
	const currentEntry = rateLimitStore.get(key);

	if (!currentEntry || currentEntry.resetAt <= now) {
		rateLimitStore.set(key, {
			count: 1,
			resetAt: now + RATE_LIMIT_WINDOW_MS,
		});
		return false;
	}

	currentEntry.count += 1;
	rateLimitStore.set(key, currentEntry);

	return currentEntry.count > RATE_LIMIT_MAX_REQUESTS;
}

function getRequestPayload(body: unknown): unknown {
	if (!body || typeof body !== "object") {
		return body;
	}

	if ("data" in body) {
		return (body as { data?: unknown }).data;
	}

	return body;
}

function hasFilledHoneypot(payload: unknown): boolean {
	if (!payload || typeof payload !== "object") {
		return false;
	}

	const website = (payload as { website?: unknown }).website;

	return typeof website === "string" && website.trim().length > 0;
}

function sendJsonError(ctx, status: number, message: string, details?: unknown) {
	ctx.status = status;
	ctx.body = {
		error: {
			message,
			...(details ? { details } : {}),
		},
	};
}

export default ({ strapi }) => ({
	async submit(ctx) {
		const payload = getRequestPayload(ctx.request.body);

		if (hasFilledHoneypot(payload)) {
			ctx.send({ ok: true });
			return;
		}

		const ip = getClientIp(ctx);

		if (isRateLimited(ip)) {
			sendJsonError(
				ctx,
				429,
				"Слишком много попыток отправки. Попробуйте еще раз через несколько минут.",
			);
			return;
		}

		try {
			const result = await strapi.service("api::order.order").submit(payload, {
				ip,
				origin: ctx.get("origin"),
				userAgent: ctx.get("user-agent"),
			});

			ctx.send({
				ok: true,
				id: result.orderId,
				mode: result.mode,
			});
		} catch (error) {
			const status = typeof error?.status === "number" ? error.status : 500;
			const message = error instanceof Error
				? error.message
				: "Не удалось отправить заказ.";

			if (status >= 500) {
				strapi.log.error(
					`[order] Submit failed: ${
						error instanceof Error ? error.stack || error.message : String(error)
					}`,
				);
			}

			sendJsonError(
				ctx,
				status,
				status >= 500
					? "Не удалось отправить заказ. Попробуйте позже или свяжитесь с менеджером."
					: message,
				error?.details,
			);
		}
	},
});
