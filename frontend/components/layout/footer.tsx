"use client";

import Link from "next/link";
import contacts from "@/data/contacts.json";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { getFooterCategories } from "@/lib/api";
import {
	getEmailHref,
	getMessengerKey,
	getPhoneHref,
	isExternalContactHref,
} from "@/lib/contact";
import type { CategoryLink, Contact } from "@/types";

const footerContact: Contact = contacts;

export function Footer() {
	const {
		data: categories,
		loading,
		error,
	} = useApi<CategoryLink[]>(getFooterCategories);

	const footerCategories = categories ?? [];

	const phoneHref = getPhoneHref(footerContact.phone);
	const emailHref = getEmailHref(footerContact.email);

	return (
		<footer className="border-t border-hairline bg-canvas">
			<div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-10">
				<div>
					<Link
						href="/"
						className="text-xl font-semibold text-ink">
						Leppa & WenSton
					</Link>

					<p className="mt-4 max-w-md text-sm text-ink-muted">
						Премиальная сантехника, зеркала и оборудование для современных
						ванных комнат.
					</p>
				</div>

				<div>
					<h2 className="text-sm font-semibold text-ink">Каталог</h2>

					<nav className="mt-4 grid gap-2 text-sm text-ink-muted">
						{loading ? (
							<p>Загружаем категории...</p>
						) : error ? (
							<p>Не удалось загрузить категории.</p>
						) : (
							footerCategories.map((category) => (
								<Link
									key={category.key}
									href={`/catalog/${category.slug}`}
									className="hover:text-ink">
									{category.name}
								</Link>
							))
						)}
					</nav>
				</div>

				<div>
					<h2 className="text-sm font-semibold text-ink">Контакты</h2>

					<div className="mt-4 flex flex-col gap-3 text-sm text-ink-muted">
						{footerContact.messengers.length > 0 ? (
							<div className="flex flex-wrap gap-3">
								{footerContact.messengers.map((messenger) => {
									const isExternal = isExternalContactHref(messenger.href);

									return (
										<Button
											key={getMessengerKey(messenger)}
											asChild
											variant="secondary"
											size="sm">
											<a
												href={messenger.href}
												target={isExternal ? "_blank" : undefined}
												rel={isExternal ? "noreferrer" : undefined}>
												{messenger.label}
											</a>
										</Button>
									);
								})}
							</div>
						) : null}

						<a
							href={phoneHref}
							className="transition-colors hover:text-ink">
							{footerContact.phone}
						</a>

						<a
							href={emailHref}
							className="transition-colors hover:text-ink">
							{footerContact.email}
						</a>

						<a
							href="https://yandex.ru/maps/-/CPgcV-2r"
							target="_blank"
							rel="noreferrer"
							className="max-w-xs leading-relaxed transition-colors hover:text-ink">
							{footerContact.address}
						</a>

						{footerContact.hours.length > 0 ? (
							<dl className="grid gap-1 leading-relaxed">
								{footerContact.hours.map((hour) => (
									<div
										key={`${hour.label}-${hour.value}`}
										className="flex flex-wrap gap-x-2">
										<dt className="font-medium text-ink">{hour.label}</dt>
										<dd>{hour.value}</dd>
									</div>
								))}
							</dl>
						) : null}
					</div>
				</div>
			</div>
		</footer>
	);
}
