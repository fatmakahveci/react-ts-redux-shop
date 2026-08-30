import Card from "@/app/components/UI/Card";
import { cartActions } from "@/app/store/cart-slice";
import { useAppDispatch } from "@/app/store/hooks";
import { formatCurrency } from "@/shared/format";
import type { Product } from "@/shared/types";
import type { FC } from "react";
import styles from "./ProductItem.module.css";

const ProductItem: FC<Product> = ({
	description,
	id,
	price,
	title,
}): React.ReactElement => {
	const dispatch = useAppDispatch();

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
		<li className={styles.item}>
			<Card>
				<header>
					<h3>{title}</h3>
					<div className={styles.price}>{formatCurrency(price)}</div>
				</header>
				<p>{description}</p>
				<div className={styles.actions}>
					<button onClick={addToCartHandler} type="button">
						Add to Cart
					</button>
				</div>
			</Card>
		</li>
	);
};

export default ProductItem;
