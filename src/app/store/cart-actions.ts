import { validatePersistedCart } from "@/shared/cart-schema";
import type { PersistedCart } from "@/shared/types";
import type { AppDispatch, RootState } from ".";
import { cartActions } from "./cart-slice";
import { uiActions } from "./ui-slice";

type CartApiResponse = {
	cart?: unknown;
	message?: string;
};

async function readJson(response: Response): Promise<CartApiResponse> {
	return (await response.json()) as CartApiResponse;
}

export const fetchCartData = () => {
	return async (dispatch: AppDispatch) => {
		try {
			const response = await fetch("/api/cart", { cache: "no-store" });
			if (!response.ok) throw new Error("Unable to fetch cart");
			const body = await readJson(response);
			const cart = await validatePersistedCart(body.cart);
			dispatch(cartActions.hydrateCart(cart));
		} catch {
			dispatch(cartActions.markHydrated());
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

export const sendCartData = (cart: PersistedCart, signal: AbortSignal) => {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch(
			uiActions.showNotification({
				message: "Sending cart data!",
				status: "pending",
				title: "Sending...",
			})
		);

		try {
			const response = await fetch("/api/cart", {
				body: JSON.stringify(cart),
				headers: { "Content-Type": "application/json" },
				method: "PUT",
				signal,
			});
			const body = await readJson(response);

			if (response.status === 409) {
				const remoteCart = await validatePersistedCart(body.cart);
				if (getState().cart.revision <= cart.revision) {
					dispatch(cartActions.hydrateCart(remoteCart));
				}
				throw new Error("Cart conflict");
			}

			if (!response.ok) throw new Error("Unable to save cart");

			dispatch(
				uiActions.showNotification({
					message: "Sent cart data successfully!",
					status: "success",
					title: "Success!",
				})
			);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return;
			}
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
