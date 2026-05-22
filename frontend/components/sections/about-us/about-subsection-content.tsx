import type { AboutSubsection } from "@/types";

type AboutSubsectionContentProps = {
	subsection: AboutSubsection;
	titleId?: string;
};

export function AboutSubsectionContent({
	subsection,
	titleId,
}: AboutSubsectionContentProps) {
	return (
		<>
			<h2
				id={titleId}
				className="max-w-4xl text-2xl font-semibold leading-[0.98] tracking-normal text-ink sm:text-3xl lg:text-5xl">
				{subsection.title}
			</h2>

			<p className="mt-6 max-w-3xl text-sm text-ink-muted sm:mt-7 sm:text-base lg:text-lg">
				{subsection.body}
			</p>

			{subsection.seo_keywords?.length ? (
				<div className="mt-7 flex max-w-3xl flex-wrap gap-2 sm:mt-8">
					{subsection.seo_keywords.map((keyword) => (
						<span
							key={`${subsection.id}-${keyword}`}
							className="rounded-full border border-hairline-strong px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted sm:text-xs sm:tracking-[0.18em]">
							{keyword}
						</span>
					))}
				</div>
			) : null}
		</>
	);
}
