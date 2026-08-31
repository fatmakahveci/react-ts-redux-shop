import CartSliceReducer, { cartActions } from "@/app/store/cart-slice";
import { sendCartMutation } from "@/app/store/cart-actions";
import UiSliceReducer from "@/app/store/ui-slice";
import type { CartMutation } from "@/shared/types";
import {
	combineReducers,
	configureStore,
	createListenerMiddleware,
	isAnyOf,
} from "@reduxjs/toolkit";

const rootReducer = combineReducers({
	cart: CartSliceReducer,
	ui: UiSliceReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore() {
	const cartListener = createListenerMiddleware();
	let mutationQueue: Promise<void> = Promise.resolve();

	cartListener.startListening({
		matcher: isAnyOf(
			cartActions.addItemToCart,
			cartActions.removeItemFromCart
		),
		effect: async (action, listenerApi) => {
			const originalState = listenerApi.getOriginalState() as RootState;
			const state = listenerApi.getState() as RootState;
			if (
				!state.cart.hydrated ||
				state.cart.revision === originalState.cart.revision
			) {
				return;
			}

			let mutation: CartMutation;
			if (cartActions.addItemToCart.match(action)) {
				mutation = { delta: 1, productId: action.payload.id };
			} else if (cartActions.removeItemFromCart.match(action)) {
				mutation = { delta: -1, productId: action.payload };
			} else {
				return;
			}
			const dispatch = listenerApi.dispatch as AppDispatch;
			const persistMutation = async () => {
				await dispatch(sendCartMutation(mutation));
			};
			mutationQueue = mutationQueue.then(persistMutation, persistMutation);
			await mutationQueue;
		},
	});

	return configureStore({
		reducer: rootReducer,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware().prepend(cartListener.middleware),
	});
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
