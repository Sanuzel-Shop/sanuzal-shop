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

function buildHtmlRows(lines: Array<[string, string]>): string {
	return lines
		.filter(([, value]) => value.length > 0)
		.map(([label, value]) => (
			`<tr><td style="padding:6px 12px 6px 0;color:#6b7280;">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(value)}</td></tr>`
		))
		.join("");
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
	const items = order.items
		.map((item, index) => (
			`<tr>
				<td style="padding:10px 8px;border-top:1px solid #e5e7eb;">${index + 1}</td>
				<td style="padding:10px 8px;border-top:1px solid #e5e7eb;">
					<strong>${escapeHtml(item.name)}</strong>
					${item.sku ? `<br><span style="color:#6b7280;">${escapeHtml(item.sku)}</span>` : ""}
					${item.href ? `<br><a href="${escapeHtml(item.href)}" style="color:#111827;">Открыть товар</a>` : ""}
				</td>
				<td style="padding:10px 8px;border-top:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
				<td style="padding:10px 8px;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(item.priceLabel)}</td>
				<td style="padding:10px 8px;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(item.lineTotalLabel)}</td>
			</tr>`
		))
		.join("");

	return `
		<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45;">
			<h1 style="margin:0 0 16px;font-size:22px;">Новый заказ ${escapeHtml(order.orderId)}</h1>
			<h2 style="margin:24px 0 8px;font-size:16px;">Покупатель</h2>
			<table cellpadding="0" cellspacing="0">${buildHtmlRows(customerLines)}</table>
			<h2 style="margin:24px 0 8px;font-size:16px;">Доставка</h2>
			<table cellpadding="0" cellspacing="0">${buildHtmlRows([
				["Страна", order.delivery.country],
				["Регион", order.delivery.region],
				["Город", order.delivery.city],
			])}</table>
			<h2 style="margin:24px 0 8px;font-size:16px;">Состав заказа</h2>
			<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
				<thead>
					<tr style="color:#6b7280;text-align:left;">
						<th style="padding:8px;">#</th>
						<th style="padding:8px;">Товар</th>
						<th style="padding:8px;text-align:center;">Кол-во</th>
						<th style="padding:8px;text-align:right;">Цена</th>
						<th style="padding:8px;text-align:right;">Сумма</th>
					</tr>
				</thead>
				<tbody>${items}</tbody>
			</table>
			<h2 style="margin:24px 0 8px;font-size:16px;">Итоги</h2>
			<table cellpadding="0" cellspacing="0">${buildHtmlRows([
				["Товаров", String(order.cartCount)],
				["Стоимость товаров", order.subtotalLabel],
				["Есть товары с ценой по запросу", order.hasRequestedPrice ? "Да" : "Нет"],
				["Перезвонить для подтверждения", order.callBack ? "Да" : "Нет"],
			])}</table>
			${order.comment ? `<h2 style="margin:24px 0 8px;font-size:16px;">Комментарий</h2><p>${escapeHtml(order.comment).replace(/\n/g, "<br>")}</p>` : ""}
			<h2 style="margin:24px 0 8px;font-size:16px;">Техническая информация</h2>
			<table cellpadding="0" cellspacing="0">${buildHtmlRows([
				["Страница", order.pageUrl],
				["IP", meta.ip || ""],
				["Origin", meta.origin || ""],
				["User-Agent", meta.userAgent || ""],
			])}</table>
		</div>
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
