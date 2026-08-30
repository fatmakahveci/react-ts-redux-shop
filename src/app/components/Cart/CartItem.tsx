import { cartActions } from "@/app/store/cart-slice";
import { useAppDispatch } from "@/app/store/hooks";
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
			<header>
				<h3>{title}</h3>
				<div className={styles.price}>
					{formatCurrency(price * quantity)}{" "}
					<span className={styles.itemPrice}>
						({formatCurrency(price)}/item)
					</span>
				</div>
			</header>
			<div className={styles.details}>
				<div className={styles.quantity}>
					x <span>{quantity}</span>
				</div>
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
		</li>
	);
};

export default CartItem;
