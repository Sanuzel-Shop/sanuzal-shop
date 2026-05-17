"use client";

import { MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useApi } from "@/hooks/useApi";

import { getContacts } from "@/lib/api";

import type { Contacts } from "@/types";

export function ContactCtaSection() {
	const {
		data: contacts,
		loading,
		error,
	} = useApi<Contacts>(getContacts);

	const whatsappButtonLabel = "Написать в WhatsApp";
	const phoneButtonLabel = "Позвонить сейчас";
	const normalizedPhone = contacts?.phone.replace(/[^\d+]/g, "") ?? "";
	const phoneHref = normalizedPhone ? `tel:${normalizedPhone}` : "#";
	const whatsappMessenger = contacts?.messengers.find((messenger) => {
		const searchValue =
			`${messenger.label} ${messenger.href}`.toLocaleLowerCase("ru-RU");

		return searchValue.includes("whatsapp") || searchValue.includes("wa.me");
	});
	const whatsappPhone = normalizedPhone.replace(/^\+/, "");
	const whatsappHref =
		whatsappMessenger?.href ?? (whatsappPhone ? `https://wa.me/${whatsappPhone}` : "#");
	const whatsappLabel = whatsappMessenger?.label ?? "WhatsApp";
	const phoneLabel = contacts?.phone ?? "";

	const statusText = loading
		? "Загружаем актуальные контакты..."
		: error
			? "Не удалось загрузить актуальные контакты."
			: "";

	return (
		<section
			id='contact-cta'
			aria-labelledby='contact-cta-title'
			className='relative bg-canvas px-5 pb-16 pt-0 text-ink sm:px-8 sm:pb-20 lg:px-14 lg:pb-24'>
			<div className='mx-auto w-full max-w-5xl'>
				<div
					aria-busy={loading}
					className='relative overflow-hidden rounded-3xl border border-hairline bg-ink px-5 py-12 text-center text-on-dark shadow-surface-lg sm:px-8 sm:py-14 lg:px-14 lg:py-16'>
					<div
						aria-hidden='true'
						className='absolute inset-0 opacity-80'
						style={{
							background:
								"linear-gradient(135deg, rgb(255 255 255 / 0.16), transparent 42%, rgb(255 255 255 / 0.08))",
						}}
					/>
					<div
						aria-hidden='true'
						className='absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent'
					/>

					<div className='relative z-10 mx-auto max-w-3xl'>
						<h2
							id='contact-cta-title'
							className='text-3xl font-semibold tracking-normal text-on-dark sm:text-4xl lg:text-6xl'>
							Готовы обсудить проект?
						</h2>

						<p className='mx-auto mt-5 max-w-2xl text-base text-on-dark/78 sm:text-lg'>
							Поможем подобрать сантехнику, зеркала и оборудование под ваш
							объект, подготовим предложение и ответим на все вопросы.
						</p>

						<div className='mt-8 flex flex-col justify-center gap-3 sm:flex-row'>
							<Button
								asChild
								className='h-12 w-full rounded-md bg-canvas px-6 text-sm font-semibold text-ink shadow-control transition-all duration-200 hover:-translate-y-0.5 hover:bg-frost hover:opacity-100 sm:w-auto'>
								<a
									href={whatsappHref}
									target='_blank'
									rel='noreferrer'
									aria-label={`${whatsappButtonLabel}: ${whatsappLabel}`}>
									<MessageCircle
										aria-hidden='true'
										className='mr-2 h-5 w-5'
										strokeWidth={1.8}
									/>
									{whatsappButtonLabel}
								</a>
							</Button>

							<Button
								asChild
								variant='outline'
								className='h-12 w-full rounded-md border-white/22 bg-white/10 px-6 text-sm font-semibold text-on-dark shadow-control backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/16 hover:text-on-dark hover:opacity-100 sm:w-auto'>
								<a
									href={phoneHref}
									aria-label={`${phoneButtonLabel}${phoneLabel ? `: ${phoneLabel}` : ""}`}>
									<Phone
										aria-hidden='true'
										className='mr-2 h-5 w-5'
										strokeWidth={1.8}
									/>
									{phoneButtonLabel}
								</a>
							</Button>
						</div>

						<p
							aria-live='polite'
							className='mt-5 min-h-5 text-sm text-on-dark/55'>
							{statusText}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
