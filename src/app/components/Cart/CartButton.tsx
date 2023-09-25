"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { uiActions } from "@/app/store/ui-slice";
import "./CartButton.css";

const CartButton = (): JSX.Element => {
	const dispatch: AppDispatch = useDispatch();
	const cartQuantity: number = useSelector((state: RootState) => state.cart.totalQuantity);
	const toggleCartHandler = (): void => {
		dispatch(uiActions.toggle());
	};

	return (
		<button className="button" onClick={toggleCartHandler}>
			<span>My Cart</span>
			<span className="badge">{cartQuantity}</span>
		</button>
	);
};

export default CartButton;
