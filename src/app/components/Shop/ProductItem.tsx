"use client";

import Card from "@/app/components/UI/Card";
import { AppDispatch } from "@/app/store";
import { cartActions } from "@/app/store/cart-slice";
import { Product } from "@/shared/types";
import { FC } from "react";
import { useDispatch } from "react-redux";
import "./ProductItem.css";

const ProductItem: FC<Product> = ({
	description,
	id,
	price,
	title,
}): JSX.Element => {
	const dispatch: AppDispatch = useDispatch();

	const addToCartHandler = (): void => {
		dispatch(
			cartActions.addItemToCart({
				id,
				description,
				price,
				title,
			})
		);
	};

	return (
		<li className="item">
			<Card className="">
				<header>
					<h3>{title}</h3>
					<div className="price">${price.toFixed(2)}</div>
				</header>
				<p>{description}</p>
				<div className="actions">
					<button onClick={addToCartHandler}>Add to Cart</button>
				</div>
			</Card>
		</li>
	);
};

export default ProductItem;
