"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { surfaceVariants } from "@/components/ui/surface";
import { formatAttributeValue } from "@/lib/utils/price";
import { cn } from "@/lib/utils";

import type { ProductAttribute } from "@/types/catalog";

type ProductInfoTab = "description" | "specifications";

const TECHNICAL_DESCRIPTION_PREFIXES = [
	"Название",
	"Производитель",
	"Артикул",
	"Цвет",
	"Материал",
	"Габариты",
];

const HIGHLIGHT_ATTRIBUTE_KEYS = [
	"material",
	"color",
	"countryOfOrigin",
	"warranty",
];

function getDescriptionParagraphs(description: string): string[] {
	const technicalLinePattern = new RegExp(
		`^(${TECHNICAL_DESCRIPTION_PREFIXES.join("|")})\\s*:`,
		"i",
	);
	const paragraphs = description
		.split(/\n{2,}/)
		.map((block) =>
			block
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line && !technicalLinePattern.test(line))
				.join(" "),
		)
		.map((block) => block.trim())
		.filter(Boolean);

	return paragraphs.length > 0 ? paragraphs : [description.trim()].filter(Boolean);
}

export function ProductInfoTabs({
	attributes,
	description,
}: {
	attributes: ProductAttribute[];
	description: string;
}) {
	const [activeTab, setActiveTab] = useState<ProductInfoTab>("description");
	const descriptionParagraphs = useMemo(
		() => getDescriptionParagraphs(description),
		[description],
	);
	const highlights = attributes.filter((attribute) =>
		HIGHLIGHT_ATTRIBUTE_KEYS.includes(attribute.key),
	);

	return (
		<section
			aria-labelledby="product-info-title"
			className="mt-14">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm font-semibold uppercase tracking-normal text-ink-faint">
						Информация о товаре
					</p>
					<h2
						id="product-info-title"
						className="mt-2 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
						Описание и характеристики
					</h2>
				</div>

				<div
					role="tablist"
					aria-label="Информация о товаре"
					className={cn(
						surfaceVariants({ variant: "muted" }),
						"grid grid-cols-2 gap-1 p-1 sm:min-w-80",
					)}>
					<Button
						type="button"
						role="tab"
						aria-selected={activeTab === "description"}
						variant={activeTab === "description" ? "dark" : "secondary"}
						size="sm"
						className="shadow-none"
						onClick={() => {
							setActiveTab("description");
						}}>
						Описание
					</Button>
					<Button
						type="button"
						role="tab"
						aria-selected={activeTab === "specifications"}
						variant={activeTab === "specifications" ? "dark" : "secondary"}
						size="sm"
						className="shadow-none"
						onClick={() => {
							setActiveTab("specifications");
						}}>
						Характеристики
					</Button>
				</div>
			</div>

			<div className={cn(surfaceVariants({ variant: "card" }), "mt-6 overflow-hidden")}>
				{activeTab === "description" ? (
					<div
						role="tabpanel"
						className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.36fr)]">
						<div className="space-y-4 text-base text-ink-muted">
							{descriptionParagraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>

						{highlights.length > 0 ? (
							<dl className="grid content-start gap-3">
								{highlights.map((attribute) => (
									<div
										key={`${attribute.key}-${attribute.value}`}
										className="border-b border-hairline pb-3 last:border-b-0 last:pb-0">
										<dt className="text-xs font-semibold uppercase tracking-normal text-ink-faint">
											{attribute.label}
										</dt>
										<dd className="mt-1 text-sm font-semibold text-ink">
											{formatAttributeValue(attribute)}
										</dd>
									</div>
								))}
							</dl>
						) : null}
					</div>
				) : (
					<dl
						role="tabpanel"
						className="divide-y divide-hairline">
						{attributes.map((attribute) => (
							<div
								key={`${attribute.key}-${attribute.value}`}
								className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[minmax(170px,0.42fr)_minmax(0,1fr)] sm:px-8">
								<dt className="text-ink-muted">{attribute.label}</dt>
								<dd className="font-medium text-ink">
									{formatAttributeValue(attribute)}
								</dd>
							</div>
						))}
					</dl>
				)}
			</div>
		</section>
	);
}
