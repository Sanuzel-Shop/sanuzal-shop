"use client";

import Link from "next/link";

import { useApi } from "@/hooks/useApi";

import { getCategories, getContacts } from "@/lib/api";

import type { Category, Contacts } from "@/types";

export function Footer() {
	const {
		data: categories,
		loading: categoriesLoading,
	} = useApi<Category[]>(getCategories);

	const {
		data: contacts,
		loading: contactsLoading,
	} = useApi<Contacts>(getContacts);

	if (categoriesLoading || contactsLoading) {
		return <footer>Loading...</footer>;
	}

	const footerCategories = categories ?? [];
	const phoneHref = contacts?.phone
		? `tel:${contacts.phone.replace(/[^\d+]/g, "")}`
		: null;

	return (
		<footer className='border-t border-hairline bg-canvas'>
			<div className='mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-10'>
				<div>
					<Link
						href='/'
						className='text-xl font-semibold text-ink'>
						{contacts?.company ?? "Leppa & WenSton"}
					</Link>

					{contacts?.description ? (
						<p className='mt-4 max-w-md text-sm text-ink-muted'>
							{contacts.description}
						</p>
					) : null}
				</div>

				<div>
					<h2 className='text-sm font-semibold text-ink'>Каталог</h2>

					<nav className='mt-4 grid gap-2 text-sm text-ink-muted'>
						{footerCategories.map((category) => (
							<Link
								key={category.id}
								href={`/categories/${category.handle}`}
								className='hover:text-ink'>
								{category.name}
							</Link>
						))}
					</nav>
				</div>

				<div>
					<h2 className='text-sm font-semibold text-ink'>Контакты</h2>

					<div className='mt-4 flex flex-col gap-3 text-sm text-ink-muted'>
						{contacts?.messengers.length ? (
							<div className='flex flex-wrap gap-3'>
								{contacts.messengers.map((messenger) => (
									<a
										key={messenger.label}
										href={messenger.href}
										target='_blank'
										rel='noreferrer'
										className='rounded-full border border-hairline px-3 py-1.5 text-xs transition-all hover:border-ink hover:text-ink'>
										{messenger.label}
									</a>
								))}
							</div>
						) : null}

						{phoneHref ? (
							<a
								href={phoneHref}
								className='transition-colors hover:text-ink'>
								{contacts?.phone}
							</a>
						) : null}

						{contacts?.email ? (
							<a
								href={`mailto:${contacts.email}`}
								className='transition-colors hover:text-ink'>
								{contacts.email}
							</a>
						) : null}

						{contacts?.address ? (
							<a
								href='https://yandex.ru/maps/-/CPgcV-2r'
								target='_blank'
								rel='noreferrer'
								className='max-w-xs leading-relaxed transition-colors hover:text-ink'>
								{contacts.address}
							</a>
						) : null}
					</div>
				</div>
			</div>
		</footer>
	);
}
