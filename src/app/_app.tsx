"use client";

import Cart from "@/app/components/Cart/Cart";
import Layout from "@/app/components/Layout/Layout";
import Products from "@/app/components/Shop/Products";
import Notification from "@/app/components/UI/Notification";
import { AppDispatch, RootState } from "@/app/store";
import { CartSliceState, NotificationProps } from "@/shared/types";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./globals.css";
import { fetchCartData, sendCartData } from "./store/cart-actions";

let isInitial: boolean = true;

const App = (): JSX.Element => {
	const dispatch: AppDispatch = useDispatch();
	const showCart: boolean = useSelector(
		(state: RootState) => state.ui.cartIsVisible
	);
	const cart: CartSliceState = useSelector((state: RootState) => state.cart);
	const notification: NotificationProps | null = useSelector(
		(state: RootState) => state.ui.notification
	);

	useEffect(() => {
		dispatch(fetchCartData());
	}, [dispatch]);

	useEffect(() => {
		if (isInitial) {
			isInitial = false;
			return;
		}

		dispatch(sendCartData(cart));
	}, [cart, dispatch]);

	return (
		<>
			{notification && (
				<Notification
					message={notification.message}
					status={notification.status}
					title={notification.title}
				/>
			)}
			<Layout>
				{showCart && <Cart />}
				<Products />
			</Layout>
		</>
	);
};

export default App;
