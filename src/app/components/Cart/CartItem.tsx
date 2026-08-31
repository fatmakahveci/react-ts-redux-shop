import { cartActions } from "@/app/store/cart-slice";
import { useAppDispatch } from "@/app/store/hooks";
import { getProduct } from "@/shared/constants";
import { formatCurrency } from "@/shared/format";
import type { CartItem as CartItemType } from "@/shared/types";
import type { FC } from "react";
import styles from "./CartItem.module.css";

const CartItem: FC<CartItemType> = ({
	id,
	price,
	quantity,
	title,
}): React.ReactElement => {
	const dispatch = useAppDispatch();
	const coverIndex = getProduct(id)?.coverIndex ?? 0;

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
		<li className={styles.item}>
			<div
				aria-hidden="true"
				className={`${styles.cover} ${styles[`cover${coverIndex}`]}`}
			/>
			<div className={styles.content}>
				<header>
					<div>
						<h3>{title}</h3>
						<p>{formatCurrency(price)} each</p>
					</div>
					<div className={styles.price}>{formatCurrency(price * quantity)}</div>
				</header>
				<div className={styles.details}>
					<span className={styles.quantity}>Qty {quantity}</span>
					<div className={styles.actions}>
						<button
							aria-label={`Remove one ${title} from cart`}
							onClick={removeItemHandler}
							type="button"
						>
							−
						</button>
						<button
							aria-label={`Add one more ${title} to cart`}
							disabled={quantity >= 99}
							onClick={addItemHandler}
							type="button"
						>
							+
						</button>
					</div>
				</div>
			</div>
		</li>
	);
};

export default CartItem;
