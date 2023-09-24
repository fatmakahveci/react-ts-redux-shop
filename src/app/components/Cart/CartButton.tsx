"use client";

import { useDispatch } from "react-redux";
import { AppDispatch } from "@/app/store";
import { uiActions } from "@/app/store/ui-slice";
import "./CartButton.css";

const CartButton = (): JSX.Element => {
	const dispatch: AppDispatch = useDispatch();

	const toggleCartHandler = (): void => {
		dispatch(uiActions.toggle());
	};

	return (
		<button className="button" onClick={toggleCartHandler}>
			<span>My Cart</span>
			<span className="badge">1</span>
		</button>
	);
};

export default CartButton;
