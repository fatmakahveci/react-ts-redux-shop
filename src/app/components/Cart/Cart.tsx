"use client";

import Card from "../UI/Card";
import "./Cart.css";
import CartItem from "./CartItem";

const Cart = (): JSX.Element => {
	return (
		<Card className="cart">
			<h2>Your Shopping Cart</h2>
			<ul>
				<CartItem title="Test Item" quantity={3} total={18} price={6} />
			</ul>
		</Card>
	);
};

export default Cart;
