import { MessageCircle, Phone } from "lucide-react";

import contacts from "@/data/contacts.json";

import { Button } from "@/components/ui/button";

const whatsappButtonLabel = "Написать в WhatsApp";
const phoneButtonLabel = "Позвонить сейчас";

export function ContactCtaSection() {
	const normalizedPhone = contacts.phone.replace(/[^\d+]/g, "");

	const phoneHref = `tel:${normalizedPhone}`;

	const whatsappMessenger = contacts.messengers.find((messenger) => {
		const searchValue =
			`${messenger.label} ${messenger.href}`.toLocaleLowerCase("ru-RU");

		return searchValue.includes("whatsapp") || searchValue.includes("wa.me");
	});

	const whatsappPhone = normalizedPhone.replace(/^\+/, "");

	const whatsappHref =
		whatsappMessenger?.href ?? `https://wa.me/${whatsappPhone}`;

	return (
		<section
			id="contact-cta"
			aria-labelledby="contact-cta-title"
			className="relative bg-canvas px-5 pb-16 pt-0 text-ink sm:px-8 sm:pb-20 lg:px-14 lg:pb-24">
			<div className="mx-auto w-full max-w-5xl">
				<div className="relative overflow-hidden rounded-3xl border border-hairline bg-ink px-5 py-12 text-center text-on-dark shadow-surface-lg sm:px-8 sm:py-14 lg:px-14 lg:py-16">
					<div
						aria-hidden="true"
						className="absolute inset-0 opacity-80"
						style={{
							background:
								"linear-gradient(135deg, rgb(255 255 255 / 0.16), transparent 42%, rgb(255 255 255 / 0.08))",
						}}
					/>

					<div
						aria-hidden="true"
						className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
					/>

					<div className="relative z-10 mx-auto max-w-3xl">
						<h2
							id="contact-cta-title"
							className="text-3xl font-semibold tracking-normal text-on-dark sm:text-4xl lg:text-6xl">
							Готовы обсудить проект?
						</h2>

						<p className="mx-auto mt-5 max-w-2xl text-base text-on-dark/78 sm:text-lg">
							Поможем подобрать сантехнику, зеркала и оборудование под ваш
							объект, подготовим предложение и ответим на все вопросы.
						</p>

						<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
							<Button
								asChild
								variant="dark"
								className="w-full border-neutral-line sm:w-auto">
								<a
									href={phoneHref}
									aria-label={`${phoneButtonLabel}: ${contacts.phone}`}>
									<Phone
										aria-hidden="true"
										strokeWidth={1.8}
									/>

									{phoneButtonLabel}
								</a>
							</Button>

							<Button
								asChild
								variant="primary"
								className="w-full sm:w-auto">
								<a
									href={whatsappHref}
									target="_blank"
									rel="noreferrer"
									aria-label={whatsappButtonLabel}>
									<MessageCircle
										aria-hidden="true"
										strokeWidth={1.8}
									/>

									{whatsappButtonLabel}
								</a>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
