"use client";

import { AppDispatch } from "@/app/store";
import { cartActions } from "@/app/store/cart-slice";
import { CartItem } from "@/shared/types";
import { FC } from "react";
import { useDispatch } from "react-redux";
import "./CartItem.css";

const CartItem: FC<CartItem> = ({
	id,
	price,
	quantity,
	title,
	total,
}): JSX.Element => {
	const dispatch: AppDispatch = useDispatch();

	const addItemHandler = () => {
		dispatch(
			cartActions.addItemToCart({
				id,
				price,
				title,
			})
		);
	};

	const removeItemHandler = () => {
		dispatch(cartActions.removeItemFromCart(id));
	};

	return (
		<li className="item">
			<header>
				<h3>{title}</h3>
				<div className="price">
					${total.toFixed(2)}{" "}
					<span className="itemprice">
						(${price.toFixed(2)}/item)
					</span>
				</div>
			</header>
			<div className="details">
				<div className="quantity">
					x <span>{quantity}</span>
				</div>
				<div className="actions">
					<button onClick={removeItemHandler}>-</button>
					<button onClick={addItemHandler}>+</button>
				</div>
			</div>
		</li>
	);
};

export default CartItem;
