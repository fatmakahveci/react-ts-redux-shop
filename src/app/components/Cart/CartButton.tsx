import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { uiActions } from "@/app/store/ui-slice";
import styles from "./CartButton.module.css";

const CartButton = (): React.ReactElement => {
	const dispatch = useAppDispatch();
	const cartIsVisible = useAppSelector((state) => state.ui.cartIsVisible);
	const cartQuantity = useAppSelector((state) =>
		state.cart.items.reduce((total, item) => total + item.quantity, 0)
	);
	const toggleCartHandler = (): void => {
		dispatch(uiActions.toggle());
	};

	return (
		<button
			aria-controls="shopping-cart"
			aria-expanded={cartIsVisible}
			className={styles.button}
			onClick={toggleCartHandler}
			type="button"
		>
			<span>My cart</span>
			<span aria-label={`${cartQuantity} items`} className={styles.badge}>
				{cartQuantity}
			</span>
		</button>
	);
};

export default CartButton;
