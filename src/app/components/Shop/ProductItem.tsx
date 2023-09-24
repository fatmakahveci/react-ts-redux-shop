"use client";

import { FC } from "react";
import { ProductItem } from "../../../shared/types";
import Card from "../UI/Card";
import "./ProductItem.css";

const ProductItem: FC<ProductItem> = ({
	description,
	price,
	title,
}): JSX.Element => {
	return (
		<li className="item">
			<Card className="">
				<header>
					<h3>{title}</h3>
					<div className="price">${price.toFixed(2)}</div>
				</header>
				<p>{description}</p>
				<div className="actions">
					<button>Add to Cart</button>
				</div>
			</Card>
		</li>
	);
};

export default ProductItem;
