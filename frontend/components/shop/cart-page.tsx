"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
	ChevronLeft,
	ChevronUp,
	Share2,
	ShoppingBag,
	Trash2,
} from "lucide-react";

import { EmptyShopState } from "@/components/shop/empty-shop-state";
import { ProductCartControls, ProductFavoriteButton } from "@/components/shop/product-actions";
import { ProductSkuCopy } from "@/components/catalog/product-sku-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FilledImage } from "@/components/media/filled-image";
import {
	getSafeProductImageSrc,
	productMediaFrameClassName,
} from "@/components/media/product-media-frame";
import { surfaceVariants } from "@/components/ui/surface";
import { copyTextToClipboard } from "@/lib/utils/clipboard";
import {
	mapCartLinesToOrderItems,
	submitCheckoutOrder,
	type CheckoutCustomer,
} from "@/lib/api/order";
import { emitShopToast, useShopState } from "@/lib/shop/store";
import { formatPrice } from "@/lib/utils/price";
import { cn } from "@/lib/utils";

import type { CartLine, ShopProductSnapshot } from "@/types/shop";

type BuyerType = "person" | "company";
type CheckoutField =
	| "organizationSearch"
	| "firstName"
	| "lastName"
	| "phone"
	| "email"
	| "companyName"
	| "inn"
	| "kpp"
	| "ogrn"
	| "legalAddress"
	| "bik"
	| "bankName"
	| "correspondentAccount"
	| "checkingAccount"
	| "region"
	| "city";

const REGION_OPTIONS = [
	"Москва",
	"Московская область",
	"Санкт-Петербург",
	"Ленинградская область",
	"Краснодарский край",
	"Республика Татарстан",
];
const EMPTY_CHECKOUT_VALUES: Record<CheckoutField, string> = {
	organizationSearch: "",
	firstName: "",
	lastName: "",
	phone: "",
	email: "",
	companyName: "",
	inn: "",
	kpp: "",
	ogrn: "",
	legalAddress: "",
	bik: "",
	bankName: "",
	correspondentAccount: "",
	checkingAccount: "",
	region: "",
	city: "",
};
const PERSON_REQUIRED_FIELDS: CheckoutField[] = [
	"firstName",
	"lastName",
	"phone",
	"email",
	"region",
	"city",
];
const COMPANY_REQUIRED_FIELDS: CheckoutField[] = [
	"organizationSearch",
	"phone",
	"email",
	"companyName",
	"inn",
	"kpp",
	"ogrn",
	"legalAddress",
	"bik",
	"bankName",
	"correspondentAccount",
	"checkingAccount",
	"region",
	"city",
];
const FIELD_LABELS: Record<CheckoutField, string> = {
	organizationSearch: "Организация или ИП",
	firstName: "Имя",
	lastName: "Фамилия",
	phone: "Телефон",
	email: "Электронная почта",
	companyName: "Компания",
	inn: "ИНН",
	kpp: "КПП",
	ogrn: "ОГРН",
	legalAddress: "Юридический адрес",
	bik: "БИК",
	bankName: "Наименование банка",
	correspondentAccount: "Корр. счет",
	checkingAccount: "Расчетный счет",
	region: "Регион",
	city: "Город",
};
type FieldErrors = Partial<Record<CheckoutField, string>>;

function getDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function isNameLike(value: string): boolean {
	return /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s'.-]{1,}$/u.test(
		value.trim(),
	);
}

function getCheckoutFieldError(field: CheckoutField, value: string): string | null {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return field === "region" ? "Выберите регион" : "Заполните поле";
	}

	if (["firstName", "lastName", "city"].includes(field)) {
		return isNameLike(trimmedValue)
			? null
			: "Используйте буквы, пробел или дефис";
	}

	if (field === "phone") {
		const digits = getDigits(trimmedValue);

		return digits.length >= 10 && digits.length <= 15
			? null
			: "Введите телефон в международном формате";
	}

	if (field === "email") {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)
			? null
			: "Введите корректную электронную почту";
	}

	if (["organizationSearch", "companyName", "bankName"].includes(field)) {
		return trimmedValue.length >= 3
			? null
			: "Минимум 3 символа";
	}

	if (field === "legalAddress") {
		return trimmedValue.length >= 6
			? null
			: "Укажите полный адрес";
	}

	if (field === "inn") {
		const digits = getDigits(trimmedValue);

		return digits.length === 10 || digits.length === 12
			? null
			: "ИНН должен содержать 10 или 12 цифр";
	}

	if (field === "kpp") {
		return getDigits(trimmedValue).length === 9
			? null
			: "КПП должен содержать 9 цифр";
	}

	if (field === "ogrn") {
		const digits = getDigits(trimmedValue);

		return digits.length === 13 || digits.length === 15
			? null
			: "ОГРН должен содержать 13 или 15 цифр";
	}

	if (field === "bik") {
		return getDigits(trimmedValue).length === 9
			? null
			: "БИК должен содержать 9 цифр";
	}

	if (["correspondentAccount", "checkingAccount"].includes(field)) {
		return getDigits(trimmedValue).length === 20
			? null
			: "Счет должен содержать 20 цифр";
	}

	return null;
}

function getProductUnitPrice(product: ShopProductSnapshot): number | null {
	if (typeof product.price === "number" && Number.isFinite(product.price)) {
		return product.price;
	}

	const digits = product.priceLabel.replace(/[^\d]/g, "");

	return digits ? Number(digits) : null;
}

function formatCartPrice(value: number | null, currency = "RUB") {
	return value == null ? "Цена по запросу" : formatPrice(value, currency);
}

function getLineTotal(line: CartLine): number | null {
	const unitPrice = getProductUnitPrice(line.product);

	return unitPrice == null ? null : unitPrice * line.quantity;
}

function CartPageSkeleton() {
	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.95fr)]">
			<div className={cn(surfaceVariants({ variant: "card" }), "h-[520px] animate-pulse bg-frost")} />
			<div className={cn(surfaceVariants({ variant: "muted" }), "h-[720px] animate-pulse")} />
		</div>
	);
}

function SummaryRow({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-baseline gap-2 text-sm">
			<span className="shrink-0 text-ink-muted">{label}</span>
			<span className="min-w-6 flex-1 border-b border-dashed border-hairline-strong" />
			<span className="shrink-0 font-semibold text-ink">{value}</span>
		</div>
	);
}

function FormField({
	children,
	error,
	label,
	required = false,
}: {
	children: ReactNode;
	error?: string;
	label: string;
	required?: boolean;
}) {
	return (
		<label className="grid gap-2 text-xs font-medium text-ink-muted">
			<span>
				{label}
				{required ? <span className="text-destructive"> *</span> : null}
			</span>
			{children}
			{error ? (
				<span className="text-xs font-medium text-destructive">{error}</span>
			) : null}
		</label>
	);
}

function BuyerTypeToggle({
	buyerType,
	onChange,
}: {
	buyerType: BuyerType;
	onChange: (buyerType: BuyerType) => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			<Button
				type="button"
				variant={buyerType === "person" ? "dark" : "secondary"}
				size="sm"
				onClick={() => {
					onChange("person");
				}}>
				Физическое лицо
			</Button>
			<Button
				type="button"
				variant={buyerType === "company" ? "dark" : "secondary"}
				size="sm"
				onClick={() => {
					onChange("company");
				}}>
				Юридическое лицо
			</Button>
		</div>
	);
}

function CartLineItem({
	line,
	onRemove,
}: {
	line: CartLine;
	onRemove: () => void;
}) {
	const unitPrice = getProductUnitPrice(line.product);
	const lineTotal = getLineTotal(line);

	return (
		<li className="grid gap-4 border-b border-hairline py-5 last:border-b-0 sm:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[84px_minmax(0,1fr)_11rem_minmax(9.5rem,12rem)] lg:items-center">
			<Link
				href={line.product.href}
				className={productMediaFrameClassName("mini", "size-20")}
				aria-label={`Открыть товар ${line.product.name}`}>
				<FilledImage
					src={getSafeProductImageSrc(line.product.image)}
					alt={line.product.name}
					sizes="84px"
					className="absolute inset-0"
				/>
			</Link>

			<div className="min-w-0">
				<Link
					href={line.product.href}
					className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors hover:text-ink-muted">
					{line.product.name}
				</Link>
				<ProductSkuCopy
					sku={line.product.sku}
					className="mt-2"
				/>
				<p className="mt-2 text-xs text-ink-muted">
					{formatCartPrice(unitPrice, line.product.currency ?? "RUB")} / шт.
				</p>
			</div>

			<ProductCartControls
				className="sm:col-start-2 lg:col-start-auto"
				layout="detail"
				product={line.product}
			/>

			<div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:col-start-2 lg:col-start-auto lg:grid lg:justify-items-end">
				<p className="min-w-0 text-lg font-semibold leading-tight text-ink sm:text-xl lg:text-right">
					{formatCartPrice(lineTotal, line.product.currency ?? "RUB")}
				</p>
				<div className="flex items-center gap-2">
					<ProductFavoriteButton
						compact
						product={line.product}
					/>
					<Button
						type="button"
						variant="secondary"
						size="icon"
						aria-label={`Удалить из корзины: ${line.product.name}`}
						className="size-11 text-ink-faint hover:text-destructive"
						onClick={onRemove}>
						<Trash2 aria-hidden="true" />
					</Button>
				</div>
			</div>
		</li>
	);
}

function CartItemsPanel({
	cartCount,
	lines,
	onClear,
	onRemove,
	onShare,
	positionsCount,
	subtotalLabel,
}: {
	cartCount: number;
	lines: CartLine[];
	onClear: () => void;
	onRemove: (productId: string) => void;
	onShare: () => void;
	positionsCount: number;
	subtotalLabel: string;
}) {
	return (
		<div>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
					Корзина
				</h1>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						className="text-ink-muted hover:text-destructive"
						onClick={onClear}>
						<Trash2
							aria-hidden="true"
							className="size-4"
						/>
						Очистить корзину
					</Button>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={onShare}>
						<Share2
							aria-hidden="true"
							className="size-4"
						/>
						Поделиться
					</Button>
				</div>
			</div>

			<div className={cn(surfaceVariants({ variant: "card" }), "p-4 sm:p-6")}>
				<ul>
					{lines.map((line) => (
						<CartLineItem
							key={line.product.id}
							line={line}
							onRemove={() => {
								onRemove(line.product.id);
							}}
						/>
					))}
				</ul>

				<div className="mt-5 grid gap-3 border-t border-hairline pt-5">
					<p className="text-xs text-ink-muted">
						Этот заказ добавит бонусные баллы после подтверждения менеджером.
					</p>

					<div className="mt-2 grid gap-2">
						<SummaryRow
							label="Товаров на сумму"
							value={subtotalLabel}
						/>
						<SummaryRow
							label="Позиций в корзине"
							value={`${positionsCount}`}
						/>
						<SummaryRow
							label="Общее количество"
							value={`${cartCount}`}
						/>
					</div>

					<div className="mt-6 flex items-baseline justify-between gap-4">
						<p className="text-base font-medium text-ink">Итого</p>
						<p className="text-3xl font-semibold text-ink sm:text-4xl">
							{subtotalLabel}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function CheckoutPanel({
	cartCount,
	lines,
	onOrderSuccess,
	hasRequestedPrice,
	subtotalLabel,
}: {
	cartCount: number;
	lines: CartLine[];
	onOrderSuccess: () => void;
	hasRequestedPrice: boolean;
	subtotalLabel: string;
}) {
	const [buyerType, setBuyerType] = useState<BuyerType>("person");
	const [callBack, setCallBack] = useState(false);
	const [comment, setComment] = useState("");
	const [formValues, setFormValues] = useState(EMPTY_CHECKOUT_VALUES);
	const [honeypot, setHoneypot] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const requiredFields = buyerType === "person"
		? PERSON_REQUIRED_FIELDS
		: COMPANY_REQUIRED_FIELDS;
	const fieldErrors = useMemo(() => {
		const nextErrors: FieldErrors = {};

		requiredFields.forEach((field) => {
			const error = getCheckoutFieldError(field, formValues[field]);

			if (error) {
				nextErrors[field] = error;
			}
		});

		return nextErrors;
	}, [formValues, requiredFields]);
	const invalidFields = requiredFields.filter((field) => fieldErrors[field]);
	const isCheckoutReady = invalidFields.length === 0;
	const invalidFieldsLabel = invalidFields
		.slice(0, 4)
		.map((field) => FIELD_LABELS[field])
		.join(", ");

	function updateField(field: CheckoutField, value: string) {
		setFormValues((currentValues) => ({
			...currentValues,
			[field]: value,
		}));
	}

	function getShownFieldError(field: CheckoutField): string | undefined {
		return formValues[field].trim() ? fieldErrors[field] : undefined;
	}

	function handleBuyerTypeChange(nextBuyerType: BuyerType) {
		setBuyerType(nextBuyerType);
		setSubmitError(null);
	}

	async function handleSubmitOrder() {
		if (!isCheckoutReady) {
			emitShopToast({
				title: "Проверьте данные",
				description: invalidFieldsLabel
					? `Заполните корректно: ${invalidFieldsLabel}`
					: undefined,
			});

			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const order = await submitCheckoutOrder({
				buyerType,
				customer: formValues as CheckoutCustomer,
				delivery: {
					country: "Российская Федерация",
					region: formValues.region,
					city: formValues.city,
				},
				items: mapCartLinesToOrderItems(
					lines,
					(line) => formatCartPrice(getProductUnitPrice(line.product), line.product.currency ?? "RUB"),
					(line) => formatCartPrice(getLineTotal(line), line.product.currency ?? "RUB"),
				),
				comment,
				callBack,
				cartCount,
				subtotalLabel,
				hasRequestedPrice,
				pageUrl: typeof window === "undefined" ? "" : window.location.href,
				website: honeypot,
			});

			const isEmailFailed = order.mode === "email_failed";
			const isSavedOnly = order.mode === "saved";
			const isMockMode = order.mode === "mock";

			emitShopToast({
				title: isEmailFailed || isSavedOnly || isMockMode
					? "Заявка сохранена"
					: "Заказ отправлен",
				description: isMockMode
					? "Тестовый режим: письмо не отправлено."
					: isSavedOnly
						? "Почта пока не настроена, менеджер увидит заявку в Strapi."
						: isEmailFailed
							? "Письмо не отправилось, но заявка есть в Strapi."
							: order.id
						? `Номер заявки: ${order.id}`
						: "Менеджер свяжется с вами для подтверждения.",
			});

			if (!isMockMode) {
				onOrderSuccess();
				setFormValues(EMPTY_CHECKOUT_VALUES);
				setComment("");
				setHoneypot("");
				setCallBack(false);
			}
		} catch (error) {
			const message = error instanceof Error
				? error.message
				: "Не удалось отправить заказ. Попробуйте еще раз.";

			setSubmitError(message);
			emitShopToast({
				title: "Не удалось отправить заказ",
				description: message,
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<aside className={cn(surfaceVariants({ variant: "muted" }), "p-5 sm:p-7")}>
			<h2 className="text-3xl font-semibold tracking-normal text-ink">
				Оформление заказа
			</h2>

			<div className="mt-6">
				<h3 className="text-lg font-semibold text-ink">
					{buyerType === "person" ? "Физическое лицо" : "Юридическое лицо"}
				</h3>
			</div>

			<div className="mt-5 grid gap-2">
				<span className="text-xs font-medium text-ink-muted">
					Тип покупателя
				</span>
				<BuyerTypeToggle
					buyerType={buyerType}
					onChange={handleBuyerTypeChange}
				/>
			</div>

			{buyerType === "company" ? (
				<div className="mt-5">
					<FormField
						label="Поиск организации или ИП"
						required
						error={getShownFieldError("organizationSearch")}>
						<Input
							value={formValues.organizationSearch}
							onChange={(event) => {
								updateField("organizationSearch", event.target.value);
							}}
							placeholder="Введите название, ИНН или адрес"
							required
						/>
					</FormField>
				</div>
			) : null}

			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				{buyerType === "person" ? (
					<>
						<FormField
							label="Имя"
							required
							error={getShownFieldError("firstName")}>
							<Input
								value={formValues.firstName}
								onChange={(event) => {
									updateField("firstName", event.target.value);
								}}
								autoComplete="given-name"
								required
							/>
						</FormField>
						<FormField
							label="Фамилия"
							required
							error={getShownFieldError("lastName")}>
							<Input
								value={formValues.lastName}
								onChange={(event) => {
									updateField("lastName", event.target.value);
								}}
								autoComplete="family-name"
								required
							/>
						</FormField>
						<FormField
							label="Телефон"
							required
							error={getShownFieldError("phone")}>
							<Input
								value={formValues.phone}
								onChange={(event) => {
									updateField("phone", event.target.value);
								}}
								autoComplete="tel"
								inputMode="tel"
								placeholder="+7 111 222-33-44"
								type="tel"
								required
							/>
						</FormField>
						<FormField
							label="Электронная почта"
							required
							error={getShownFieldError("email")}>
							<Input
								value={formValues.email}
								onChange={(event) => {
									updateField("email", event.target.value);
								}}
								type="email"
								autoComplete="email"
								required
							/>
						</FormField>
					</>
				) : (
					<>
						<FormField
							label="Телефон"
							required
							error={getShownFieldError("phone")}>
							<Input
								value={formValues.phone}
								onChange={(event) => {
									updateField("phone", event.target.value);
								}}
								autoComplete="tel"
								inputMode="tel"
								placeholder="+7 111 222-33-44"
								type="tel"
								required
							/>
						</FormField>
						<FormField
							label="Электронная почта"
							required
							error={getShownFieldError("email")}>
							<Input
								value={formValues.email}
								onChange={(event) => {
									updateField("email", event.target.value);
								}}
								type="email"
								autoComplete="email"
								required
							/>
						</FormField>
						<FormField
							label="Компания"
							required
							error={getShownFieldError("companyName")}>
							<Input
								value={formValues.companyName}
								onChange={(event) => {
									updateField("companyName", event.target.value);
								}}
								required
							/>
						</FormField>
						<FormField
							label="ИНН"
							required
							error={getShownFieldError("inn")}>
							<Input
								value={formValues.inn}
								onChange={(event) => {
									updateField("inn", event.target.value);
								}}
								inputMode="numeric"
								required
							/>
						</FormField>
						<FormField
							label="КПП"
							required
							error={getShownFieldError("kpp")}>
							<Input
								value={formValues.kpp}
								onChange={(event) => {
									updateField("kpp", event.target.value);
								}}
								inputMode="numeric"
								required
							/>
						</FormField>
						<FormField
							label="ОГРН"
							required
							error={getShownFieldError("ogrn")}>
							<Input
								value={formValues.ogrn}
								onChange={(event) => {
									updateField("ogrn", event.target.value);
								}}
								inputMode="numeric"
								required
							/>
						</FormField>
						<FormField
							label="Юридический адрес"
							required
							error={getShownFieldError("legalAddress")}>
							<Input
								value={formValues.legalAddress}
								onChange={(event) => {
									updateField("legalAddress", event.target.value);
								}}
								required
							/>
						</FormField>
						<FormField
							label="БИК"
							required
							error={getShownFieldError("bik")}>
							<Input
								value={formValues.bik}
								onChange={(event) => {
									updateField("bik", event.target.value);
								}}
								inputMode="numeric"
								required
							/>
						</FormField>
						<FormField
							label="Наименование банка"
							required
							error={getShownFieldError("bankName")}>
							<Input
								value={formValues.bankName}
								onChange={(event) => {
									updateField("bankName", event.target.value);
								}}
								required
							/>
						</FormField>
						<FormField
							label="Корр. счет"
							required
							error={getShownFieldError("correspondentAccount")}>
							<Input
								value={formValues.correspondentAccount}
								onChange={(event) => {
									updateField("correspondentAccount", event.target.value);
								}}
								inputMode="numeric"
								required
							/>
						</FormField>
						<FormField
							label="Расчетный счет"
							required
							error={getShownFieldError("checkingAccount")}>
							<Input
								value={formValues.checkingAccount}
								onChange={(event) => {
									updateField("checkingAccount", event.target.value);
								}}
								inputMode="numeric"
								required
							/>
						</FormField>
					</>
				)}
			</div>

			<h3 className="mt-8 text-xl font-semibold text-ink">Доставка</h3>
			<p className="mt-3 text-xs text-ink-muted">
				<span className="text-destructive">*</span> Для расчета стоимости и
				срока доставки заполните поля со звездочкой
			</p>

			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				<FormField
					label="Страна"
					required>
					<Input
						value="Российская Федерация"
						readOnly
						required
					/>
				</FormField>
				<FormField
					label="Регион"
					required
					error={getShownFieldError("region")}>
					<Select
						value={formValues.region}
						onChange={(event) => {
							updateField("region", event.target.value);
						}}
						required>
						<option value="">Выберите регион</option>
						{REGION_OPTIONS.map((option) => (
							<option
								key={option}
								value={option}>
								{option}
							</option>
						))}
					</Select>
				</FormField>
				<FormField
					label="Город"
					required
					error={getShownFieldError("city")}>
					<Input
						value={formValues.city}
						onChange={(event) => {
							updateField("city", event.target.value);
						}}
						autoComplete="address-level2"
						required
					/>
				</FormField>
			</div>

			<div className="mt-7">
				<div className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
					Комментарий к заказу
					<ChevronUp
						aria-hidden="true"
						className="size-4"
					/>
				</div>
				<textarea
					value={comment}
					onChange={(event) => {
						setComment(event.target.value);
						setSubmitError(null);
					}}
					className="min-h-28 w-full resize-y rounded-md border border-hairline bg-canvas px-4 py-3 text-sm text-ink shadow-control outline-none placeholder:text-ink-faint focus-visible:border-hairline-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				/>
			</div>

			<label className="sr-only">
				Сайт
				<input
					value={honeypot}
					onChange={(event) => {
						setHoneypot(event.target.value);
					}}
					tabIndex={-1}
					autoComplete="off"
				/>
			</label>

			<div className="mt-7 grid gap-3">
				<SummaryRow
					label="Стоимость товаров"
					value={subtotalLabel}
				/>
				<SummaryRow
					label="Стоимость доставки"
					value="не выбрано"
				/>
			</div>

			<div className="mt-7 flex flex-wrap items-baseline justify-between gap-4">
				<p className="text-base font-medium text-ink">
					Итого без учета доставки:
				</p>
				<p className="text-3xl font-semibold text-ink sm:text-4xl">
					{subtotalLabel}
				</p>
			</div>

			{hasRequestedPrice ? (
				<p className="mt-3 text-xs text-ink-muted">
					В корзине есть товары с ценой по запросу. Менеджер уточнит итоговую
					стоимость после оформления.
				</p>
			) : null}

			<Button
				type="button"
				variant="dark"
				className="mt-6 w-full"
				disabled={!isCheckoutReady || isSubmitting}
				onClick={handleSubmitOrder}>
				{isSubmitting ? "Отправляем заказ..." : "Отправить заказ"}
			</Button>
			{submitError ? (
				<p className="mt-3 text-xs font-medium text-destructive">
					{submitError}
				</p>
			) : null}
			{!isCheckoutReady ? (
				<p className="mt-3 text-xs text-ink-muted">
					Заполните корректно: {invalidFieldsLabel}
					{invalidFields.length > 4 ? " и другие поля" : ""}.
				</p>
			) : null}

			<div className="mt-5 rounded-md border border-hairline bg-canvas p-4 text-sm leading-relaxed text-ink">
				<p className="font-semibold">
					Вы можете отказаться от обязательного звонка менеджера для
					подтверждения заказа, Ваш заказ сразу будет собран и отправлен.
				</p>
				<p className="mt-3 text-ink-muted">
					При необходимости мы все же перезвоним Вам для уточнения контактной
					информации или наличия товара.
				</p>
				<label className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink">
					<input
						type="checkbox"
						checked={callBack}
						onChange={(event) => {
							setCallBack(event.target.checked);
						}}
						className="size-5 rounded-sm border border-hairline accent-ink"
					/>
					Перезвоните мне для подтверждения заказа
				</label>
			</div>
		</aside>
	);
}

export function CartPage() {
	const {
		cartCount,
		clearCart,
		hydrated,
		removeFromCart,
		state,
	} = useShopState();
	const subtotal = useMemo(() => {
		return state.cart.reduce((total, line) => {
			const lineTotal = getLineTotal(line);

			return lineTotal == null ? total : total + lineTotal;
		}, 0);
	}, [state.cart]);
	const hasRequestedPrice = state.cart.some((line) => getLineTotal(line) == null);
	const subtotalLabel =
		subtotal > 0 ? formatPrice(subtotal, "RUB") : "Цена по запросу";
	const isEmpty = hydrated && state.cart.length === 0;

	async function handleShare() {
		const shareText = `Корзина Leppa & WenSton: ${cartCount} товаров`;

		if (typeof navigator !== "undefined" && navigator.share) {
			try {
				await navigator.share({
					title: "Корзина Leppa & WenSton",
					text: shareText,
					url: window.location.href,
				});
				return;
			} catch {
				// User may cancel native sharing; fall through to copy.
			}
		}

		const didCopy = await copyTextToClipboard(window.location.href);

		emitShopToast({
			title: didCopy ? "Ссылка на корзину скопирована" : "Не удалось скопировать ссылку",
			description: shareText,
		});
	}

	return (
		<section className="min-h-screen bg-canvas text-ink">
			<div
				className={cn(
					"mx-auto w-full px-5 pb-16 pt-32 sm:px-8 sm:pb-20 sm:pt-36 lg:px-10 lg:pb-24 lg:pt-40",
					isEmpty
						? "flex min-h-screen max-w-5xl flex-col"
						: "max-w-[1480px]",
				)}>
				<Link
					href="/catalog"
					className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
					<ChevronLeft
						aria-hidden="true"
						className="size-4"
					/>
					Вернуться к покупкам
				</Link>

				<div
					className={cn(
						isEmpty
							? "flex flex-1 items-center justify-center py-10"
							: "mt-8",
					)}>
					{!hydrated ? (
						<CartPageSkeleton />
					) : state.cart.length > 0 ? (
						<div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.95fr)] lg:items-start">
							<CartItemsPanel
								cartCount={cartCount}
								lines={state.cart}
								onClear={clearCart}
								onRemove={removeFromCart}
								onShare={handleShare}
								positionsCount={state.cart.length}
								subtotalLabel={subtotalLabel}
							/>
							<CheckoutPanel
								cartCount={cartCount}
								lines={state.cart}
								onOrderSuccess={clearCart}
								hasRequestedPrice={hasRequestedPrice}
								subtotalLabel={subtotalLabel}
							/>
						</div>
					) : (
						<EmptyShopState
							icon={(
								<ShoppingBag
									aria-hidden="true"
									className="size-6"
								/>
							)}
							title="Корзина пуста"
							description="Добавьте товары из каталога, чтобы оформить заказ."
						/>
					)}
				</div>
			</div>
		</section>
	);
}
