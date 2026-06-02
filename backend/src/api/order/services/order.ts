const nodemailer = require("nodemailer") as {
	createTransport: (options: SmtpTransportConfig) => {
		sendMail: (message: MailMessage) => Promise<{ messageId?: string }>;
	};
};

type BuyerType = "person" | "company";

type CustomerPayload = {
	organizationSearch?: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	email?: string;
	companyName?: string;
	inn?: string;
	kpp?: string;
	ogrn?: string;
	legalAddress?: string;
	bik?: string;
	bankName?: string;
	correspondentAccount?: string;
	checkingAccount?: string;
};

type DeliveryPayload = {
	country?: string;
	region?: string;
	city?: string;
};

type OrderItemPayload = {
	id?: string;
	name?: string;
	sku?: string | null;
	href?: string;
	quantity?: number;
	priceLabel?: string;
	lineTotalLabel?: string;
};

type NormalizedOrder = {
	orderId: string;
	buyerType: BuyerType;
	customer: Required<CustomerPayload>;
	delivery: Required<DeliveryPayload>;
	items: Required<OrderItemPayload>[];
	comment: string;
	callBack: boolean;
	cartCount: number;
	subtotalLabel: string;
	hasRequestedPrice: boolean;
	pageUrl: string;
};

type RequestMeta = {
	ip?: string;
	origin?: string;
	userAgent?: string;
};

type MailSettings = {
	enabled: boolean;
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
	from: string;
	to: string[];
	bcc: string[];
	subjectPrefix: string;
};

type SmtpTransportConfig = {
	host: string;
	port: number;
	secure: boolean;
	connectionTimeout?: number;
	greetingTimeout?: number;
	socketTimeout?: number;
	auth?: {
		user: string;
		pass: string;
	};
};

type MailMessage = {
	from: string;
	to: string[];
	bcc?: string[];
	replyTo?: string;
	subject: string;
	text: string;
	html: string;
};

type StoredOrderRecord = {
	documentId?: string;
	id?: number;
};

type SubmitOrderMode = "email" | "email_failed" | "saved";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_COUNTRY = "Российская Федерация";
const ORDER_UID = "api::order.order";
const TRUTHY_ENV_VALUES = ["1", "true", "yes", "on"];

function getString(value: unknown, maxLength = 500): string {
	if (typeof value !== "string") {
		return "";
	}

	return value.trim().slice(0, maxLength);
}

function getBoolean(value: unknown): boolean {
	return value === true;
}

function getDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function getOrderId(): string {
	const now = new Date();
	const date = now.toISOString().slice(0, 10).replace(/-/g, "");
	const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

	return `LW-${date}-${suffix}`;
}

function createHttpError(status: number, message: string, details?: unknown) {
	const error = new Error(message) as Error & {
		status?: number;
		details?: unknown;
	};

	error.status = status;
	error.details = details;

	return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMailList(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function getEnvBoolean(value: string | undefined, fallback = false): boolean {
	if (value == null || value === "") {
		return fallback;
	}

	return TRUTHY_ENV_VALUES.includes(value.toLowerCase());
}

function getMailSettings(): MailSettings {
	const host = getString(process.env.SMTP_HOST, 200);
	const user = getString(process.env.SMTP_USER, 200);
	const pass = getString(process.env.SMTP_PASS, 500);
	const from = getString(process.env.MAIL_FROM, 300);
	const to = parseMailList(getString(process.env.MAIL_TO, 1000));
	const bcc = parseMailList(getString(process.env.MAIL_BCC, 1000));
	const port = Number(process.env.SMTP_PORT || 587);
	const hasAnyMailConfig = Boolean(host || user || pass || from || to.length || bcc.length);
	const explicitlyEnabled = getEnvBoolean(process.env.MAIL_ENABLED, false);
	const enabled = process.env.MAIL_ENABLED === "false"
		? false
		: explicitlyEnabled || hasAnyMailConfig;

	return {
		enabled,
		host,
		port: Number.isFinite(port) ? port : 587,
		secure: getEnvBoolean(process.env.SMTP_SECURE, port === 465),
		user,
		pass,
		from,
		to,
		bcc,
		subjectPrefix: getString(
			process.env.ORDER_MAIL_SUBJECT_PREFIX,
			120,
		) || "Leppa & WenSton",
	};
}

function assertMailSettings(settings: MailSettings) {
	if (!settings.enabled) {
		return;
	}

	const missingFields: string[] = [];

	if (!settings.host) {
		missingFields.push("SMTP_HOST");
	}

	if (!settings.port) {
		missingFields.push("SMTP_PORT");
	}

	if (!settings.from) {
		missingFields.push("MAIL_FROM");
	}

	if (settings.to.length === 0) {
		missingFields.push("MAIL_TO");
	}

	if (Boolean(settings.user) !== Boolean(settings.pass)) {
		missingFields.push("SMTP_USER и SMTP_PASS должны быть заполнены вместе");
	}

	if (missingFields.length > 0) {
		throw createHttpError(
			500,
			`Почта настроена не полностью: ${missingFields.join(", ")}`,
		);
	}
}

function validateCustomer(order: NormalizedOrder, errors: string[]) {
	const customer = order.customer;
	const requiredBaseFields = ["phone", "email"] as const;

	requiredBaseFields.forEach((field) => {
		if (!customer[field]) {
			errors.push(`${field}: заполните поле`);
		}
	});

	if (customer.phone) {
		const digits = getDigits(customer.phone);

		if (digits.length < 10 || digits.length > 15) {
			errors.push("phone: введите телефон в международном формате");
		}
	}

	if (customer.email && !EMAIL_PATTERN.test(customer.email)) {
		errors.push("email: введите корректную электронную почту");
	}

	if (order.buyerType === "person") {
		(["firstName", "lastName"] as const).forEach((field) => {
			if (!customer[field]) {
				errors.push(`${field}: заполните поле`);
			}
		});
	}

	if (order.buyerType === "company") {
		const requiredCompanyFields = [
			"organizationSearch",
			"companyName",
			"inn",
			"kpp",
			"ogrn",
			"legalAddress",
			"bik",
			"bankName",
			"correspondentAccount",
			"checkingAccount",
		] as const;

		requiredCompanyFields.forEach((field) => {
			if (!customer[field]) {
				errors.push(`${field}: заполните поле`);
			}
		});

		if (customer.inn) {
			const digits = getDigits(customer.inn);

			if (digits.length !== 10 && digits.length !== 12) {
				errors.push("inn: ИНН должен содержать 10 или 12 цифр");
			}
		}

		if (customer.kpp && getDigits(customer.kpp).length !== 9) {
			errors.push("kpp: КПП должен содержать 9 цифр");
		}

		if (customer.ogrn) {
			const digits = getDigits(customer.ogrn);

			if (digits.length !== 13 && digits.length !== 15) {
				errors.push("ogrn: ОГРН должен содержать 13 или 15 цифр");
			}
		}

		if (customer.bik && getDigits(customer.bik).length !== 9) {
			errors.push("bik: БИК должен содержать 9 цифр");
		}

		if (
			customer.correspondentAccount
			&& getDigits(customer.correspondentAccount).length !== 20
		) {
			errors.push("correspondentAccount: счет должен содержать 20 цифр");
		}

		if (customer.checkingAccount && getDigits(customer.checkingAccount).length !== 20) {
			errors.push("checkingAccount: счет должен содержать 20 цифр");
		}
	}
}

function validateOrder(order: NormalizedOrder) {
	const errors: string[] = [];

	validateCustomer(order, errors);

	if (!order.delivery.region) {
		errors.push("region: выберите регион");
	}

	if (!order.delivery.city) {
		errors.push("city: заполните поле");
	}

	if (order.items.length === 0) {
		errors.push("items: корзина пуста");
	}

	if (order.items.length > 100) {
		errors.push("items: в одном заказе не может быть больше 100 позиций");
	}

	order.items.forEach((item, index) => {
		if (!item.name) {
			errors.push(`items.${index}.name: укажите название товара`);
		}

		if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
			errors.push(`items.${index}.quantity: укажите корректное количество`);
		}
	});

	if (errors.length > 0) {
		throw createHttpError(400, "Проверьте данные заказа.", errors);
	}
}

function normalizeItem(item: OrderItemPayload): Required<OrderItemPayload> {
	const quantity = Number(item.quantity);

	return {
		id: getString(item.id, 120),
		name: getString(item.name, 300),
		sku: getString(item.sku, 120) || null,
		href: getString(item.href, 500),
		quantity: Number.isInteger(quantity) ? quantity : 0,
		priceLabel: getString(item.priceLabel, 120),
		lineTotalLabel: getString(item.lineTotalLabel, 120),
	};
}

function normalizeOrder(payload: unknown): NormalizedOrder {
	if (!isRecord(payload)) {
		throw createHttpError(400, "Некорректные данные заказа.");
	}

	const rawCustomer = isRecord(payload.customer) ? payload.customer : {};
	const rawDelivery = isRecord(payload.delivery) ? payload.delivery : {};
	const rawItems = Array.isArray(payload.items) ? payload.items : [];
	const buyerType = payload.buyerType === "company" ? "company" : "person";

	const order: NormalizedOrder = {
		orderId: getOrderId(),
		buyerType,
		customer: {
			organizationSearch: getString(rawCustomer.organizationSearch, 300),
			firstName: getString(rawCustomer.firstName, 120),
			lastName: getString(rawCustomer.lastName, 120),
			phone: getString(rawCustomer.phone, 80),
			email: getString(rawCustomer.email, 200).toLowerCase(),
			companyName: getString(rawCustomer.companyName, 300),
			inn: getString(rawCustomer.inn, 40),
			kpp: getString(rawCustomer.kpp, 40),
			ogrn: getString(rawCustomer.ogrn, 40),
			legalAddress: getString(rawCustomer.legalAddress, 500),
			bik: getString(rawCustomer.bik, 40),
			bankName: getString(rawCustomer.bankName, 300),
			correspondentAccount: getString(rawCustomer.correspondentAccount, 60),
			checkingAccount: getString(rawCustomer.checkingAccount, 60),
		},
		delivery: {
			country: getString(rawDelivery.country, 120) || DEFAULT_COUNTRY,
			region: getString(rawDelivery.region, 160),
			city: getString(rawDelivery.city, 160),
		},
		items: rawItems
			.filter(isRecord)
			.map((item) => normalizeItem(item as OrderItemPayload)),
		comment: getString(payload.comment, 1500),
		callBack: getBoolean(payload.callBack),
		cartCount: Number(payload.cartCount) || 0,
		subtotalLabel: getString(payload.subtotalLabel, 120),
		hasRequestedPrice: getBoolean(payload.hasRequestedPrice),
		pageUrl: getString(payload.pageUrl, 500),
	};

	validateOrder(order);

	return order;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatLines(lines: Array<[string, string]>): string {
	return lines
		.filter(([, value]) => value.length > 0)
		.map(([label, value]) => `${label}: ${value}`)
		.join("\n");
}

function getBuyerName(order: NormalizedOrder): string {
	if (order.buyerType === "company") {
		return order.customer.companyName || order.customer.organizationSearch;
	}

	return [order.customer.firstName, order.customer.lastName]
		.filter(Boolean)
		.join(" ");
}

function getEmailErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function updateStoredOrder(
	strapi,
	record: StoredOrderRecord | null,
	data: Record<string, unknown>,
) {
	if (!record?.documentId) {
		return;
	}

	try {
		await strapi.documents(ORDER_UID).update({
			documentId: record.documentId,
			data,
		});
	} catch (error) {
		strapi.log.error(
			`[order] Failed to update stored order ${record.documentId}: ${getEmailErrorMessage(error)}`,
		);
	}
}

async function createStoredOrder(
	strapi,
	order: NormalizedOrder,
	meta: RequestMeta,
	emailStatus: "disabled" | "pending",
): Promise<StoredOrderRecord> {
	const customerName = getBuyerName(order);
	const record = await strapi.documents(ORDER_UID).create({
		data: {
			orderNumber: order.orderId,
			processingStatus: "new",
			emailStatus,
			buyerType: order.buyerType,
			customerName,
			companyName: order.customer.companyName || order.customer.organizationSearch,
			phone: order.customer.phone,
			email: order.customer.email,
			customer: order.customer,
			delivery: order.delivery,
			items: order.items,
			comment: order.comment,
			callBack: order.callBack,
			cartCount: order.cartCount,
			subtotalLabel: order.subtotalLabel,
			hasRequestedPrice: order.hasRequestedPrice,
			pageUrl: order.pageUrl,
			requestMeta: meta,
		},
	});

	return {
		documentId: record?.documentId,
		id: record?.id,
	};
}

function buildTextEmail(order: NormalizedOrder, meta: RequestMeta): string {
	const customerLines: Array<[string, string]> = order.buyerType === "company"
		? [
			["Тип покупателя", "Юридическое лицо"],
			["Организация или ИП", order.customer.organizationSearch],
			["Компания", order.customer.companyName],
			["Телефон", order.customer.phone],
			["Email", order.customer.email],
			["ИНН", order.customer.inn],
			["КПП", order.customer.kpp],
			["ОГРН", order.customer.ogrn],
			["Юридический адрес", order.customer.legalAddress],
			["БИК", order.customer.bik],
			["Банк", order.customer.bankName],
			["Корр. счет", order.customer.correspondentAccount],
			["Расчетный счет", order.customer.checkingAccount],
		]
		: [
			["Тип покупателя", "Физическое лицо"],
			["Имя", order.customer.firstName],
			["Фамилия", order.customer.lastName],
			["Телефон", order.customer.phone],
			["Email", order.customer.email],
		];

	const itemLines = order.items
		.map((item, index) => {
			return [
				`${index + 1}. ${item.name}`,
				item.sku ? `Артикул: ${item.sku}` : "",
				`Количество: ${item.quantity}`,
				item.priceLabel ? `Цена: ${item.priceLabel}` : "",
				item.lineTotalLabel ? `Сумма: ${item.lineTotalLabel}` : "",
				item.href ? `Ссылка: ${item.href}` : "",
			]
				.filter(Boolean)
				.join("\n");
		})
		.join("\n\n");

	return [
		`Новый заказ ${order.orderId}`,
		"",
		"Покупатель",
		formatLines(customerLines),
		"",
		"Доставка",
		formatLines([
			["Страна", order.delivery.country],
			["Регион", order.delivery.region],
			["Город", order.delivery.city],
		]),
		"",
		"Состав заказа",
		itemLines,
		"",
		"Итоги",
		formatLines([
			["Товаров", String(order.cartCount)],
			["Стоимость товаров", order.subtotalLabel],
			["Есть товары с ценой по запросу", order.hasRequestedPrice ? "Да" : "Нет"],
			["Перезвонить для подтверждения", order.callBack ? "Да" : "Нет"],
		]),
		order.comment ? `\nКомментарий\n${order.comment}` : "",
		"",
		"Техническая информация",
		formatLines([
			["Страница", order.pageUrl],
			["IP", meta.ip || ""],
			["Origin", meta.origin || ""],
			["User-Agent", meta.userAgent || ""],
		]),
	].join("\n");
}

function formatMailDate(date = new Date()): string {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/Moscow",
	}).format(date);
}

function getBaseUrl(order: NormalizedOrder, meta: RequestMeta): string {
	if (meta.origin) {
		return meta.origin;
	}

	if (!order.pageUrl) {
		return "";
	}

	try {
		return new URL(order.pageUrl).origin;
	} catch {
		return "";
	}
}

function getAbsoluteUrl(value: string, baseUrl: string): string {
	if (!value) {
		return "";
	}

	try {
		return new URL(value, baseUrl || undefined).href;
	} catch {
		return value;
	}
}

function getPhoneHref(phone: string): string {
	const normalizedPhone = phone.replace(/[^\d+]/g, "");

	return normalizedPhone ? `tel:${normalizedPhone}` : "";
}

function buildHtmlRows(lines: Array<[string, string]>): string {
	return lines
		.filter(([, value]) => value.length > 0)
		.map(([label, value]) => (
			`<tr>
				<td style="padding:7px 14px 7px 0;color:#6e6e73;font-size:13px;line-height:1.35;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
				<td style="padding:7px 0;color:#161617;font-size:14px;font-weight:600;line-height:1.35;vertical-align:top;">${escapeHtml(value)}</td>
			</tr>`
		))
		.join("");
}

function buildHtmlSummaryTile(label: string, value: string, isPrimary = false): string {
	return `
		<td style="padding:4px;width:33.333%;vertical-align:top;">
			<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;background:${isPrimary ? "#161617" : "#f5f5f7"};border:1px solid ${isPrimary ? "#161617" : "#e8e8ed"};border-radius:8px;">
				<tr>
					<td style="padding:14px 14px 13px;">
						<div style="color:${isPrimary ? "#f5f5f7" : "#6e6e73"};font-size:12px;font-weight:600;line-height:1.2;">${escapeHtml(label)}</div>
						<div style="margin-top:7px;color:${isPrimary ? "#ffffff" : "#161617"};font-size:${isPrimary ? "20px" : "16px"};font-weight:700;line-height:1.2;">${escapeHtml(value)}</div>
					</td>
				</tr>
			</table>
		</td>
	`;
}

function buildHtmlSection(title: string, content: string): string {
	return `
		<tr>
			<td style="padding-top:18px;">
				<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e8e8ed;border-radius:8px;">
					<tr>
						<td style="padding:22px 22px 20px;">
							<h2 style="margin:0 0 14px;color:#161617;font-size:18px;font-weight:700;line-height:1.25;letter-spacing:0;">${escapeHtml(title)}</h2>
							${content}
						</td>
					</tr>
				</table>
			</td>
		</tr>
	`;
}

function buildHtmlAction(href: string, label: string, isPrimary = false): string {
	if (!href) {
		return "";
	}

	return `
		<a href="${escapeHtml(href)}" style="display:inline-block;margin:6px 8px 0 0;padding:10px 15px;border-radius:999px;border:1px solid ${isPrimary ? "#161617" : "#d8d8df"};background:${isPrimary ? "#161617" : "#ffffff"};color:${isPrimary ? "#ffffff" : "#161617"};font-size:13px;font-weight:700;line-height:1;text-decoration:none;">${escapeHtml(label)}</a>
	`;
}

function buildHtmlEmail(order: NormalizedOrder, meta: RequestMeta): string {
	const customerLines: Array<[string, string]> = order.buyerType === "company"
		? [
			["Тип покупателя", "Юридическое лицо"],
			["Организация или ИП", order.customer.organizationSearch],
			["Компания", order.customer.companyName],
			["Телефон", order.customer.phone],
			["Email", order.customer.email],
			["ИНН", order.customer.inn],
			["КПП", order.customer.kpp],
			["ОГРН", order.customer.ogrn],
			["Юридический адрес", order.customer.legalAddress],
			["БИК", order.customer.bik],
			["Банк", order.customer.bankName],
			["Корр. счет", order.customer.correspondentAccount],
			["Расчетный счет", order.customer.checkingAccount],
		]
		: [
			["Тип покупателя", "Физическое лицо"],
			["Имя", order.customer.firstName],
			["Фамилия", order.customer.lastName],
			["Телефон", order.customer.phone],
			["Email", order.customer.email],
		];
	const buyerName = getBuyerName(order) || "Покупатель";
	const baseUrl = getBaseUrl(order, meta);
	const pageUrl = getAbsoluteUrl(order.pageUrl, baseUrl);
	const phoneHref = getPhoneHref(order.customer.phone);
	const emailHref = order.customer.email ? `mailto:${order.customer.email}` : "";
	const preheader = `Новый заказ ${order.orderId}: ${buyerName}, ${order.cartCount} товаров.`;
	const buyerTypeLabel = order.buyerType === "company" ? "Юридическое лицо" : "Физическое лицо";
	const deliveryLabel = [order.delivery.region, order.delivery.city]
		.filter(Boolean)
		.join(", ");
	const items = order.items
		.map((item, index) => (
			`<tr>
				<td style="padding:15px 12px;border-top:${index === 0 ? "0" : "1px solid #e8e8ed"};color:#6e6e73;font-size:13px;vertical-align:top;">${index + 1}</td>
				<td style="padding:15px 12px;border-top:${index === 0 ? "0" : "1px solid #e8e8ed"};vertical-align:top;">
					<div style="color:#161617;font-size:15px;font-weight:700;line-height:1.35;">${escapeHtml(item.name)}</div>
					${item.sku ? `<div style="margin-top:4px;color:#6e6e73;font-size:12px;line-height:1.35;">Артикул: ${escapeHtml(item.sku)}</div>` : ""}
					${item.href ? `<a href="${escapeHtml(getAbsoluteUrl(item.href, baseUrl))}" style="display:inline-block;margin-top:9px;color:#161617;font-size:12px;font-weight:700;text-decoration:underline;text-underline-offset:2px;">Открыть товар</a>` : ""}
				</td>
				<td style="padding:15px 12px;border-top:${index === 0 ? "0" : "1px solid #e8e8ed"};color:#161617;font-size:14px;font-weight:700;text-align:center;vertical-align:top;">${item.quantity}</td>
				<td style="padding:15px 12px;border-top:${index === 0 ? "0" : "1px solid #e8e8ed"};color:#161617;font-size:14px;font-weight:600;text-align:right;vertical-align:top;white-space:nowrap;">${escapeHtml(item.priceLabel || "по запросу")}</td>
				<td style="padding:15px 12px;border-top:${index === 0 ? "0" : "1px solid #e8e8ed"};color:#161617;font-size:14px;font-weight:700;text-align:right;vertical-align:top;white-space:nowrap;">${escapeHtml(item.lineTotalLabel || item.priceLabel || "по запросу")}</td>
			</tr>`
		))
		.join("");

	return `<!doctype html>
	<html lang="ru">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<meta name="color-scheme" content="light">
			<title>Новый заказ ${escapeHtml(order.orderId)}</title>
		</head>
		<body style="margin:0;padding:0;background:#f5f5f7;color:#161617;">
			<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
			<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f5f7;">
				<tr>
					<td align="center" style="padding:28px 12px;">
						<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:760px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Segoe UI',Arial,sans-serif;">
							<tr>
								<td style="padding:0 0 14px;">
									<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e8e8ed;border-radius:999px;">
										<tr>
											<td style="padding:12px 18px;">
												<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
													<tr>
														<td style="color:#161617;font-size:18px;font-weight:800;line-height:1;">L&amp;W</td>
														<td align="right" style="color:#6e6e73;font-size:13px;font-weight:600;line-height:1.3;">Leppa &amp; WenSton</td>
													</tr>
												</table>
											</td>
										</tr>
									</table>
								</td>
							</tr>

							<tr>
								<td style="padding:0;">
									<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#161617;border-radius:8px;">
										<tr>
											<td style="padding:30px 28px;">
												<div style="display:inline-block;margin:0 0 18px;padding:8px 12px;border:1px solid rgba(255,255,255,0.22);border-radius:999px;color:#f5f5f7;font-size:12px;font-weight:700;line-height:1;">Новая заявка с сайта</div>
												<h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:800;line-height:1.15;letter-spacing:0;">Заказ ${escapeHtml(order.orderId)}</h1>
												<p style="margin:12px 0 0;color:#d8d8df;font-size:15px;line-height:1.5;">${escapeHtml(buyerName)} оформил заказ ${escapeHtml(formatMailDate())}. ${deliveryLabel ? `Доставка: ${escapeHtml(deliveryLabel)}.` : ""}</p>
												<div style="margin-top:20px;">
													<span style="display:inline-block;margin:0 6px 6px 0;padding:8px 11px;border-radius:999px;background:#ffffff;color:#161617;font-size:12px;font-weight:800;line-height:1;">${escapeHtml(buyerTypeLabel)}</span>
													<span style="display:inline-block;margin:0 6px 6px 0;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,0.12);color:#ffffff;font-size:12px;font-weight:700;line-height:1;">${order.callBack ? "Нужен звонок" : "Без обязательного звонка"}</span>
													${order.hasRequestedPrice ? `<span style="display:inline-block;margin:0 6px 6px 0;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,0.12);color:#ffffff;font-size:12px;font-weight:700;line-height:1;">Есть цена по запросу</span>` : ""}
												</div>
											</td>
										</tr>
									</table>
								</td>
							</tr>

							<tr>
								<td style="padding-top:14px;">
									<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
										<tr>
											${buildHtmlSummaryTile("Товаров", String(order.cartCount))}
											${buildHtmlSummaryTile("Стоимость", order.subtotalLabel || "по запросу", true)}
											${buildHtmlSummaryTile("Перезвонить", order.callBack ? "Да" : "Нет")}
										</tr>
									</table>
								</td>
							</tr>

							${buildHtmlSection(
								"Покупатель",
								`<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${buildHtmlRows(customerLines)}</table>
								<div style="margin-top:13px;">
									${buildHtmlAction(phoneHref, "Позвонить", true)}
									${buildHtmlAction(emailHref, "Написать клиенту")}
								</div>`,
							)}

							${buildHtmlSection(
								"Доставка",
								`<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${buildHtmlRows([
									["Страна", order.delivery.country],
									["Регион", order.delivery.region],
									["Город", order.delivery.city],
								])}</table>`,
							)}

							${buildHtmlSection(
								"Состав заказа",
								`<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
									<thead>
										<tr>
											<th align="left" style="padding:0 12px 11px;color:#6e6e73;font-size:11px;font-weight:800;letter-spacing:0;text-transform:uppercase;">#</th>
											<th align="left" style="padding:0 12px 11px;color:#6e6e73;font-size:11px;font-weight:800;letter-spacing:0;text-transform:uppercase;">Товар</th>
											<th align="center" style="padding:0 12px 11px;color:#6e6e73;font-size:11px;font-weight:800;letter-spacing:0;text-transform:uppercase;">Кол-во</th>
											<th align="right" style="padding:0 12px 11px;color:#6e6e73;font-size:11px;font-weight:800;letter-spacing:0;text-transform:uppercase;">Цена</th>
											<th align="right" style="padding:0 12px 11px;color:#6e6e73;font-size:11px;font-weight:800;letter-spacing:0;text-transform:uppercase;">Сумма</th>
										</tr>
									</thead>
									<tbody>${items}</tbody>
								</table>`,
							)}

							${order.comment ? buildHtmlSection(
								"Комментарий",
								`<p style="margin:0;color:#161617;font-size:14px;line-height:1.55;">${escapeHtml(order.comment).replace(/\n/g, "<br>")}</p>`,
							) : ""}

							${buildHtmlSection(
								"Техническая информация",
								`<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${buildHtmlRows([
									["Номер заявки", order.orderId],
									["Страница", pageUrl],
									["IP", meta.ip || ""],
									["Origin", meta.origin || ""],
									["User-Agent", meta.userAgent || ""],
								])}</table>
								${buildHtmlAction(pageUrl, "Открыть страницу сайта")}`,
							)}

							<tr>
								<td align="center" style="padding:20px 10px 0;color:#6e6e73;font-size:12px;line-height:1.5;">
									Leppa &amp; WenSton · Премиальная сантехника, зеркала и оборудование для современных ванных комнат.
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
	</html>
	`;
}

export default ({ strapi }) => ({
	async submit(payload: unknown, meta: RequestMeta = {}) {
		const order = normalizeOrder(payload);
		const settings = getMailSettings();
		const storedOrder = await createStoredOrder(
			strapi,
			order,
			meta,
			settings.enabled ? "pending" : "disabled",
		);

		if (!settings.enabled) {
			strapi.log.info(
				`[order] Stored without email for ${order.orderId}: ${getBuyerName(order)} (${order.customer.email})`,
			);

			return {
				orderId: order.orderId,
				mode: "saved" satisfies SubmitOrderMode,
				recordId: storedOrder.documentId,
			};
		}

		try {
			assertMailSettings(settings);

			const transportConfig: SmtpTransportConfig = {
				host: settings.host,
				port: settings.port,
				secure: settings.secure,
				connectionTimeout: 10000,
				greetingTimeout: 10000,
				socketTimeout: 15000,
			};

			if (settings.user && settings.pass) {
				transportConfig.auth = {
					user: settings.user,
					pass: settings.pass,
				};
			}

			const transporter = nodemailer.createTransport(transportConfig);
			const buyerName = getBuyerName(order);
			const subject = `[${settings.subjectPrefix}] Новый заказ ${order.orderId}${buyerName ? ` от ${buyerName}` : ""}`;

			await transporter.sendMail({
				from: settings.from,
				to: settings.to,
				bcc: settings.bcc.length > 0 ? settings.bcc : undefined,
				replyTo: order.customer.email,
				subject,
				text: buildTextEmail(order, meta),
				html: buildHtmlEmail(order, meta),
			});

			await updateStoredOrder(strapi, storedOrder, {
				emailStatus: "sent",
				emailSentAt: new Date().toISOString(),
				emailError: null,
			});

			strapi.log.info(`[order] Email sent for ${order.orderId}`);

			return {
				orderId: order.orderId,
				mode: "email" satisfies SubmitOrderMode,
				recordId: storedOrder.documentId,
			};
		} catch (error) {
			const emailError = getEmailErrorMessage(error);

			await updateStoredOrder(strapi, storedOrder, {
				emailStatus: "failed",
				emailError,
			});

			strapi.log.error(`[order] Email failed for ${order.orderId}: ${emailError}`);

			return {
				orderId: order.orderId,
				mode: "email_failed" satisfies SubmitOrderMode,
				recordId: storedOrder.documentId,
			};
		}
	},
});
