import CartItem from "@/app/components/Cart/CartItem";
import Card from "@/app/components/UI/Card";
import { useAppSelector } from "@/app/store/hooks";
import type { CartItem as CartItemType } from "@/shared/types";
import styles from "./Cart.module.css";

const Cart = (): React.ReactElement => {
	const cartItems = useAppSelector((state) => state.cart.items);

	return (
		<Card className={styles.cart}>
			<section aria-labelledby="cart-title" id="shopping-cart">
			<h2 id="cart-title">Your Shopping Cart</h2>
			{cartItems.length === 0 ? (
				<p>Your cart is empty.</p>
			) : (
			<ul>
				{cartItems.map((item: CartItemType) => (
					<CartItem
						key={item.id}
						id={item.id}
						title={item.title}
						quantity={item.quantity}
						price={item.price}
					/>
				))}
			</ul>
			)}
			</section>
		</Card>
	);
};

export default Cart;
