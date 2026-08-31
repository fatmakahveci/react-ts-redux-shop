"use client";

import { uiActions } from "@/app/store/ui-slice";
import { useAppDispatch } from "@/app/store/hooks";
import { useEffect, useRef } from "react";
import Cart from "./Cart";
import styles from "./CartDrawer.module.css";

export default function CartDrawer(): React.ReactElement {
	const dispatch = useAppDispatch();
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const drawerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const previouslyFocused = document.activeElement;
		const handleKeyboard = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				dispatch(uiActions.closeCart());
				return;
			}
			if (event.key !== "Tab") return;

			const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), a[href], input, select, summary, [tabindex]:not([tabindex="-1"])'
			);
			if (!focusable?.length) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.body.classList.add("cart-drawer-open");
		document.addEventListener("keydown", handleKeyboard);
		closeButtonRef.current?.focus();

		return () => {
			document.body.classList.remove("cart-drawer-open");
			document.removeEventListener("keydown", handleKeyboard);
			if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
		};
	}, [dispatch]);

	return (
		<div
			className={styles.backdrop}
			onMouseDown={(event) => {
				if (event.currentTarget === event.target) {
					dispatch(uiActions.closeCart());
				}
			}}
		>
			<div
				aria-labelledby="cart-title"
				aria-modal="true"
				className={styles.drawer}
				ref={drawerRef}
				role="dialog"
			>
				<button
					aria-label="Close shopping cart"
					className={styles.close}
					onClick={() => dispatch(uiActions.closeCart())}
					ref={closeButtonRef}
					type="button"
				>
					<span aria-hidden="true">×</span>
				</button>
				<Cart />
			</div>
		</div>
	);
}
