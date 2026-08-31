"use client";

import { cartActions } from "@/app/store/cart-slice";
import { useAppDispatch } from "@/app/store/hooks";
import { uiActions } from "@/app/store/ui-slice";
import { validatePersistedCart } from "@/shared/cart-schema";
import { formatCurrency } from "@/shared/format";
import { useState, type FormEvent } from "react";
import styles from "./Checkout.module.css";

type CheckoutProps = {
	itemCount: number;
	onBack: () => void;
	subtotal: number;
};

type CheckoutStatus = "idle" | "processing" | "complete" | "error";

export default function Checkout({
	itemCount,
	onBack,
	subtotal,
}: CheckoutProps): React.ReactElement {
	const dispatch = useAppDispatch();
	const [status, setStatus] = useState<CheckoutStatus>("idle");
	const [orderNumber, setOrderNumber] = useState("");

	const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setStatus("processing");

		try {
			const response = await fetch("/api/cart", {
				method: "DELETE",
				signal: AbortSignal.timeout(10_000),
			});
			const body = (await response.json()) as { cart?: unknown };
			if (!response.ok) throw new Error("Unable to place order");

			dispatch(cartActions.hydrateCart(await validatePersistedCart(body.cart)));
			setOrderNumber(
				`QS-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`
			);
			setStatus("complete");
		} catch {
			setStatus("error");
		}
	};

	if (status === "complete") {
		return (
			<section aria-labelledby="cart-title" className={styles.complete}>
				<span aria-hidden="true" className={styles.checkmark}>✓</span>
				<p className={styles.eyebrow}>Order confirmed</p>
				<h2 id="cart-title">Thank you for your order</h2>
				<p>
					Your {itemCount} {itemCount === 1 ? "book is" : "books are"} being
					prepared. This demo order did not collect or charge a card.
				</p>
				<dl className={styles.receipt}>
					<div>
						<dt>Order</dt>
						<dd>{orderNumber}</dd>
					</div>
					<div>
						<dt>Total</dt>
						<dd>{formatCurrency(subtotal)}</dd>
					</div>
				</dl>
				<button onClick={() => dispatch(uiActions.closeCart())} type="button">
					Continue browsing
				</button>
			</section>
		);
	}

	return (
		<section aria-labelledby="cart-title" className={styles.checkout}>
			<button
				className={styles.back}
				disabled={status === "processing"}
				onClick={onBack}
				type="button"
			>
				← Back to cart
			</button>
			<p className={styles.eyebrow}>Secure demo checkout</p>
			<h2 id="cart-title">Delivery details</h2>
			<p className={styles.intro}>
				Your details stay in this browser and are not stored or sent to a
				payment provider.
			</p>

			<form onSubmit={submitOrder}>
				<label>
					<span>Full name</span>
					<input autoComplete="name" name="name" required />
				</label>
				<label>
					<span>Email</span>
					<input autoComplete="email" name="email" required type="email" />
				</label>
				<label className={styles.fullWidth}>
					<span>Street address</span>
					<input autoComplete="street-address" name="address" required />
				</label>
				<label>
					<span>City</span>
					<input autoComplete="address-level2" name="city" required />
				</label>
				<label>
					<span>Postal code</span>
					<input autoComplete="postal-code" name="postalCode" required />
				</label>

				<fieldset className={styles.fullWidth}>
					<legend>Payment</legend>
					<label className={styles.paymentOption}>
						<input defaultChecked name="payment" type="radio" value="delivery" />
						<span>
							<strong>Pay on delivery</strong>
							<small>No card details required</small>
						</span>
					</label>
					<label className={styles.paymentOption}>
						<input name="payment" type="radio" value="pickup" />
						<span>
							<strong>Reserve for pickup</strong>
							<small>Pay when you collect your books</small>
						</span>
					</label>
				</fieldset>

				<div className={`${styles.total} ${styles.fullWidth}`}>
					<span>{itemCount} {itemCount === 1 ? "book" : "books"}</span>
					<strong>{formatCurrency(subtotal)}</strong>
				</div>
				{status === "error" && (
					<p className={`${styles.error} ${styles.fullWidth}`} role="alert">
						We couldn’t place your order. Please try again.
					</p>
				)}
				<button
					className={`${styles.submit} ${styles.fullWidth}`}
					disabled={status === "processing"}
					type="submit"
				>
					{status === "processing"
						? "Placing order…"
						: `Place order · ${formatCurrency(subtotal)}`}
				</button>
			</form>
		</section>
	);
}
