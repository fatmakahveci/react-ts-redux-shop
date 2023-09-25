"use client";

import Card from "@/app/components/UI/Card";
import { AppDispatch } from "@/app/store";
import { ProductItem } from "@/shared/types";
import { FC } from "react";
import { useDispatch } from "react-redux";
import "./ProductItem.css";

const ProductItem: FC<ProductItem> = ({
	description,
	price,
	title,
}): JSX.Element => {
	const dispatch: AppDispatch = useDispatch();

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
