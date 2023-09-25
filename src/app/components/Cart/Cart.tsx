"use client";

import CartItem from "@/app/components/Cart/CartItem";
import Card from "@/app/components/UI/Card";
import { RootState } from "@/app/store/index";
import { useSelector } from "react-redux";
import "./Cart.css";

const Cart = (): JSX.Element => {
	const cartItems: CartItem[] = useSelector(
		(state: RootState) => state.cart.items
	);

	return (
		<Card className="cart">
			<h2>Your Shopping Cart</h2>
			<ul>
				{cartItems.map((item: CartItem) => (
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
