import { validatePersistedCart } from "@/shared/cart-schema";
import type { CartMutation, PersistedCart } from "@/shared/types";
import type { AppDispatch, RootState } from ".";
import { cartActions } from "./cart-slice";
import { uiActions } from "./ui-slice";

type CartApiResponse = {
	cart?: unknown;
	message?: string;
};

const CART_REQUEST_TIMEOUT_MS = 10_000;

async function readJson(response: Response): Promise<CartApiResponse> {
	return (await response.json()) as CartApiResponse;
}

async function requestCurrentCart(): Promise<PersistedCart> {
	const response = await fetch("/api/cart", {
		cache: "no-store",
		signal: AbortSignal.timeout(CART_REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error("Unable to fetch cart");
	const body = await readJson(response);
	return validatePersistedCart(body.cart);
}

export const fetchCartData = () => {
	return async (dispatch: AppDispatch) => {
		try {
			dispatch(cartActions.hydrateCart(await requestCurrentCart()));
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

export const sendCartMutation = (mutation: CartMutation) => {
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
				body: JSON.stringify(mutation),
				headers: { "Content-Type": "application/json" },
				method: "PATCH",
				signal: AbortSignal.timeout(CART_REQUEST_TIMEOUT_MS),
			});
			const body = await readJson(response);

			if (!response.ok) throw new Error("Unable to save cart");
			const remoteCart = await validatePersistedCart(body.cart);
			if (remoteCart.revision >= getState().cart.revision) {
				dispatch(cartActions.reconcileCart(remoteCart));
			}

			dispatch(
				uiActions.showNotification({
					message: "Sent cart data successfully!",
					status: "success",
					title: "Success!",
				})
			);
		} catch {
			try {
				dispatch(cartActions.hydrateCart(await requestCurrentCart()));
			} catch {
				// Preserve the optimistic state when the authoritative cart is unreachable.
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
