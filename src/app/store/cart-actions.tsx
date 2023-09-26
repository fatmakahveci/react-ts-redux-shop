"use client";

import { CartSliceState } from "@/shared/types";
import { AppDispatch } from ".";
import { uiActions } from "./ui-slice";
import { cartActions } from "./cart-slice";

export const fetchCartData = () => {
	return async (dispatch: AppDispatch) => {
		const fetchData = async () => {
			const response: Response = await fetch(
				"https://react-ts-shop-49e4e-default-rtdb.firebaseio.com/cart.json"
			);

			if (!response.ok) {
				throw new Error("Couldn't fetch cart data!");
			}

			const data: Response = await response.json();

			return data;
		};

		try {
			const cartData: any = await fetchData();
			dispatch(
				cartActions.replaceCart({
					items: cartData.items || [],
					totalQuantity: cartData.totalQuantity,
				})
			);
		} catch (error: unknown) {
			dispatch(
				uiActions.showNotification({
					message: "Fetching cart data failed!",
					status: "error",
					title: "Error!",
				})
			);
		}
	};
};

export const sendCartData = (cart: CartSliceState) => {
	return async (dispatch: AppDispatch) => {
		dispatch(
			uiActions.showNotification({
				message: "Sending cart data!",
				status: "pending",
				title: "Sending...",
			})
		);

		const sendRequest = async (): Promise<void> => {
			const response: Response = await fetch(
				"https://react-ts-shop-49e4e-default-rtdb.firebaseio.com/cart.json",
				{
					method: "PUT",
					body: JSON.stringify({
						items: cart.items,
						totalQuantity: cart.totalQuantity,
					}),
				}
			);

			if (!response.ok) {
				throw new Error("Sending cart data failed.");
			}
		};

		try {
			await sendRequest();

			dispatch(
				uiActions.showNotification({
					message: "Sent cart data successfully!",
					status: "success",
					title: "Success!",
				})
			);
		} catch (error: unknown) {
			dispatch(
				uiActions.showNotification({
					message: "Sent cart data failed!",
					status: "error",
					title: "Error!",
				})
			);
		}
	};
};
