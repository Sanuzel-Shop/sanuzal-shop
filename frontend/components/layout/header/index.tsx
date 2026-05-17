"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, SearchIcon, Heart, Menu, X } from "lucide-react";

import Link from "next/link";

import { NAV_ITEMS } from "./data";

const Header = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const pathname = usePathname();
	const activePage = pathname === "/" ? "" : pathname.replace("/", "");

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	const handleNavClick = () => {
		// Close menu immediately when navigating
		setIsOpen(false);
	};

	useEffect(() => {
		document.body.classList.toggle("overlay", isOpen);

		return () => {
			document.body.classList.remove("overlay");
		};
	}, [isOpen]);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 768px)");
		const handleDesktopChange = (event: MediaQueryListEvent) => {
			if (event.matches) {
				setIsOpen(false);
			}
		};

		mediaQuery.addEventListener("change", handleDesktopChange);

		return () => {
			mediaQuery.removeEventListener("change", handleDesktopChange);
		};
	}, []);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	return (
		<header className='fixed top-4 left-1/2 z-50 w-full max-w-5xl -translate-x-1/2 px-4 isolate'>
			<div className='grid w-full grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-3 rounded-full border border-hairline bg-toolbar px-5 py-2 shadow-header md:grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] md:gap-4 md:px-6'>
				{/* Logo on left */}
				<Link
					href='/'
					className='flex shrink-0 items-center text-lg font-bold text-ink transition-opacity hover:opacity-85'
					aria-label='Leppa & WenSton — на главную'
					onClick={handleNavClick}>
					L&W
				</Link>

				{/* Navigation in center - desktop only */}
				<nav className='hidden justify-center rounded-full gap-1 border border-hairline bg-overlay p-1 shadow-control md:flex md:justify-self-center'>
					{NAV_ITEMS.map((item) => {
						const isActive = activePage === item.href.replace("/", "");
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`rounded-full px-3 py-1 text-sm font-medium transition-all duration-300 ${
									isActive
										? "bg-muted text-foreground border shadow-control"
										: "text-ink-muted border border-transparent hover:bg-ink-splash"
								}`}>
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* Icons on right */}
				<div className='flex items-center justify-end gap-2 md:gap-3'>
					<button
						type='button'
						className='flex size-8 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-muted shadow-control transition-all duration-300 hover:bg-ink hover:text-on-dark'>
						<Heart className='h-4 w-4' />
					</button>
					<button
						type='button'
						className='flex size-8 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-muted shadow-control transition-all duration-300 hover:bg-ink hover:text-on-dark'>
						<ShoppingBag className='h-4 w-4' />
					</button>
					{/* Mobile menu toggle */}
					<div className='relative md:hidden'>
						<button
							type='button'
							className={`flex size-8 items-center justify-center rounded-full border border-hairline shadow-control transition-all duration-300 ${
								isOpen
									? "bg-ink text-on-dark"
									: "bg-canvas text-ink-muted hover:bg-ink hover:text-on-dark"
							}`}
							aria-controls='mobile-navigation-menu'
							aria-expanded={isOpen}
							aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
							onClick={() => handleOpenChange(!isOpen)}>
							{isOpen ? (
								<X className='h-4 w-4 transition-all duration-300' />
							) : (
								<Menu className='h-4 w-4 transition-all duration-300' />
							)}
						</button>

						{/* Mobile menu */}
						<div
							id='mobile-navigation-menu'
							className={`fixed top-14 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-5xl px-4 transition-all duration-300
    ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
							<div className='bg-overlay rounded-chrome-panel px-6 py-3 menu-content transition-all duration-300 pointer-events-auto border border-hairline shadow-surface-lg'>
								<nav className='flex flex-col space-y-2'>
									{NAV_ITEMS.map((item) => {
										const isActive = activePage === item.href.replace("/", "");
										return (
											<Link
												key={item.href}
												href={item.href}
												onClick={handleNavClick}
												className={`w-full px-4 py-2 text-center text-sm font-medium rounded-full transition-colors duration-300 ${
													isActive
														? "bg-muted text-foreground border shadow-control"
														: "text-ink-muted border border-transparent hover:bg-ink-splash"
												}`}>
												{item.label}
											</Link>
										);
									})}
								</nav>
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
};

export { Header };