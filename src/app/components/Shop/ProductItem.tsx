import Card from "@/app/components/UI/Card";
import { cartActions } from "@/app/store/cart-slice";
import { useAppDispatch } from "@/app/store/hooks";
import { formatCurrency } from "@/shared/format";
import type { CatalogProduct } from "@/shared/types";
import { memo, type FC } from "react";
import styles from "./ProductItem.module.css";

const coverClasses = [
	styles.cover0,
	styles.cover1,
	styles.cover2,
	styles.cover3,
	styles.cover4,
	styles.cover5,
] as const;

const ProductItem: FC<CatalogProduct> = ({
	author,
	category,
	coverIndex,
	description,
	id,
	pages,
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
			<Card className={styles.card}>
				<div
					aria-label={`${title} cover artwork`}
					className={`${styles.cover} ${coverClasses[coverIndex]}`}
					role="img"
				/>
				<div className={styles.content}>
					<div className={styles.meta}>
						<span>{category}</span>
						<span>{pages} pages</span>
					</div>
					<header>
						<div>
							<h3>{title}</h3>
							<p className={styles.author}>by {author}</p>
						</div>
						<div className={styles.price}>{formatCurrency(price)}</div>
					</header>
					<p className={styles.description}>{description}</p>
					<details className={styles.details}>
						<summary>Book details</summary>
						<p>
							A carefully edited paperback with tactile, responsibly sourced
							paper and a compact format made for everyday reading.
						</p>
					</details>
				</div>
				<div className={styles.actions}>
					<button
						aria-label={`Add ${title} to cart`}
						onClick={addToCartHandler}
						type="button"
					>
						Add to Cart
					</button>
				</div>
			</Card>
		</li>
	);
};

export default memo(ProductItem);
