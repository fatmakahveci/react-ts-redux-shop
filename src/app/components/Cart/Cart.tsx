"use client";

import CartItem from "@/app/components/Cart/CartItem";
import Card from "@/app/components/UI/Card";
import { RootState } from "@/app/store/index";
import type { CartItem as CartItemType } from "@/shared/types";
import { useSelector } from "react-redux";
import "./Cart.css";

const Cart = (): React.ReactElement => {
	const cartItems: CartItemType[] = useSelector(
		(state: RootState) => state.cart.items
	);

	return (
		<Card className="cart">
			<h2>Your Shopping Cart</h2>
			<ul>
				{cartItems.map((item: CartItemType) => (
					<CartItem
						key={item.id}
						id={item.id}
						title={item.title}
						quantity={item.quantity}
						total={item.total}
						price={item.price}
					/>
				))}
			</ul>
		</Card>
	);
};

export default Cart;
