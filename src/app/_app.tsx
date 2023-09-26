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
import { uiActions } from "./store/ui-slice";

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
		const sendCartData = async (): Promise<void> => {
			dispatch(
				uiActions.showNotification({
					message: "Sending cart data!",
					status: "pending",
					title: "Sending...",
				})
			);

			const response: Response = await fetch(
				"https://react-ts-shop-49e4e-default-rtdb.firebaseio.com/cart.json",
				{ method: "PUT", body: JSON.stringify(cart) }
			);

			if (!response.ok) {
				throw new Error("Sending cart data failed.");
			}

			dispatch(
				uiActions.showNotification({
					message: "Sent cart data successfully!",
					status: "success",
					title: "Success!",
				})
			);
		};
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
