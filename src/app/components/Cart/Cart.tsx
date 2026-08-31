import CartItem from "@/app/components/Cart/CartItem";
import Card from "@/app/components/UI/Card";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { uiActions } from "@/app/store/ui-slice";
import { formatCurrency } from "@/shared/format";
import type { CartItem as CartItemType } from "@/shared/types";
import { useState } from "react";
import Checkout from "./Checkout";
import styles from "./Cart.module.css";

const FREE_SHIPPING_THRESHOLD = 35;

const Cart = (): React.ReactElement => {
	const dispatch = useAppDispatch();
	const [checkoutSummary, setCheckoutSummary] = useState<{
		itemCount: number;
		subtotal: number;
	} | null>(null);
	const cartItems = useAppSelector((state) => state.cart.items);
	const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
	const subtotal = cartItems.reduce(
		(total, item) => total + item.price * item.quantity,
		0
	);
	const shippingRemaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
	if (checkoutSummary) {
		return (
			<Checkout
				itemCount={checkoutSummary.itemCount}
				onBack={() => setCheckoutSummary(null)}
				subtotal={checkoutSummary.subtotal}
			/>
		);
	}

	return (
		<Card className={styles.cart}>
			<section aria-labelledby="cart-title" id="shopping-cart">
				<header className={styles.header}>
					<div>
						<p>Your selection</p>
						<h2 id="cart-title">Your Shopping Cart</h2>
					</div>
					<span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
				</header>
				{cartItems.length === 0 ? (
					<div className={styles.empty}>
						<p>Your cart is ready for a good story.</p>
						<a
							href="#catalog"
							onClick={() => dispatch(uiActions.closeCart())}
						>
							Browse the shelf
						</a>
					</div>
				) : (
					<>
						<div className={styles.shipping}>
							<p>
								{shippingRemaining > 0
									? `${formatCurrency(shippingRemaining)} away from free shipping`
									: "You unlocked free shipping"}
							</p>
							<progress
								aria-label="Free shipping progress"
								max={FREE_SHIPPING_THRESHOLD}
								value={Math.min(subtotal, FREE_SHIPPING_THRESHOLD)}
							/>
						</div>
						<ul>
							{cartItems.map((item: CartItemType) => (
								<CartItem key={item.id} {...item} />
							))}
						</ul>
						<footer className={styles.summary}>
							<div>
								<span>Subtotal</span>
								<strong>{formatCurrency(subtotal)}</strong>
							</div>
							<p>Taxes and shipping are calculated at checkout.</p>
							<button
								onClick={() => setCheckoutSummary({ itemCount, subtotal })}
								type="button"
							>
								Checkout securely
							</button>
						</footer>
					</>
				)}
			</section>
		</Card>
	);
};

export default Cart;
