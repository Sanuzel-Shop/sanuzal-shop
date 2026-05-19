"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { Heart, Menu, ShoppingBag, X } from "lucide-react";

import navItems from "@/data/header.json";

const Header = () => {
	const [isOpen, setIsOpen] = useState(false);

	const pathname = usePathname();

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	const handleNavClick = () => {
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
		<header className="fixed left-1/2 top-4 z-50 isolate w-full max-w-5xl -translate-x-1/2 px-4">
			<div className="grid w-full grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-3 rounded-full border border-hairline bg-toolbar px-5 py-2 shadow-header md:grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] md:gap-4 md:px-6">
				{/* Logo */}
				<Link
					href="/"
					onClick={handleNavClick}
					aria-label="Leppa & WenSton — на главную"
					className="flex shrink-0 items-center text-lg font-bold text-ink transition-opacity hover:opacity-85">
					L&W
				</Link>

				{/* Desktop navigation */}
				<nav className="hidden justify-center gap-1 rounded-full border border-hairline bg-overlay p-1 shadow-control md:flex md:justify-self-center">
					{navItems.map((item) => {
						const isActive = pathname === item.href;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={`rounded-full border px-3 py-1 text-sm font-medium transition-all duration-300 ${
									isActive
										? "border-hairline bg-muted text-foreground shadow-control"
										: "border-transparent text-ink-muted hover:bg-ink-splash"
								}`}>
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* Actions */}
				<div className="flex items-center justify-end gap-2 md:gap-3">
					<button
						type="button"
						className="flex size-8 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-muted shadow-control transition-all duration-300 hover:bg-ink hover:text-on-dark">
						<Heart className="h-4 w-4" />
					</button>

					<button
						type="button"
						className="flex size-8 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-muted shadow-control transition-all duration-300 hover:bg-ink hover:text-on-dark">
						<ShoppingBag className="h-4 w-4" />
					</button>

					{/* Mobile menu */}
					<div className="relative md:hidden">
						<button
							type="button"
							onClick={() => handleOpenChange(!isOpen)}
							aria-controls="mobile-navigation-menu"
							aria-expanded={isOpen}
							aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
							className={`flex size-8 items-center justify-center rounded-full border border-hairline shadow-control transition-all duration-300 ${
								isOpen
									? "bg-ink text-on-dark"
									: "bg-canvas text-ink-muted hover:bg-ink hover:text-on-dark"
							}`}>
							{isOpen ? (
								<X className="h-4 w-4 transition-all duration-300" />
							) : (
								<Menu className="h-4 w-4 transition-all duration-300" />
							)}
						</button>

						<div
							id="mobile-navigation-menu"
							className={`fixed left-1/2 top-14 z-50 w-full max-w-5xl -translate-x-1/2 px-4 transition-all duration-300 ${
								isOpen ? "visible opacity-100" : "invisible opacity-0"
							}`}>
							<div className="menu-content pointer-events-auto rounded-chrome-panel border border-hairline bg-overlay px-6 py-3 shadow-surface-lg transition-all duration-300">
								<nav className="flex flex-col space-y-2">
									{navItems.map((item) => {
										const isActive = pathname === item.href;

										return (
											<Link
												key={item.href}
												href={item.href}
												onClick={handleNavClick}
												className={`w-full rounded-full px-4 py-2 text-center text-sm font-medium transition-colors duration-300 ${
													isActive
														? "border bg-muted text-foreground shadow-control"
														: "border border-transparent text-ink-muted hover:bg-ink-splash"
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
