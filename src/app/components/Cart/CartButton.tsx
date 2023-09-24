"use client";

import "./CartButton.css";

const CartButton = (): JSX.Element => {
	return (
		<button className="button">
			<span>My Cart</span>
			<span className="badge">1</span>
		</button>
	);
};

export default CartButton;
