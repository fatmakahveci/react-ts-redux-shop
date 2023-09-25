"use client";

import CartItem from "@/app/components/Cart/CartItem";
import Card from "@/app/components/UI/Card";
import "./Cart.css";

const Cart = (): JSX.Element => {
	return (
		<Card className="cart">
			<h2>Your Shopping Cart</h2>
			<ul>
				<CartItem
					id="1"
					title="Test Item"
					quantity={3}
					total={18}
					price={6}
				/>
			</ul>
		</Card>
	);
};

export default Cart;
