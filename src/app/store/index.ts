import CartSliceReducer, { cartActions } from "@/app/store/cart-slice";
import { sendCartData } from "@/app/store/cart-actions";
import UiSliceReducer from "@/app/store/ui-slice";
import type { PersistedCart } from "@/shared/types";
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

	cartListener.startListening({
		matcher: isAnyOf(
			cartActions.addItemToCart,
			cartActions.removeItemFromCart
		),
		effect: async (_, listenerApi) => {
			listenerApi.cancelActiveListeners();
			await listenerApi.delay(400);

			const state = listenerApi.getState() as RootState;
			if (!state.cart.hydrated) return;

			const cart: PersistedCart = {
				items: state.cart.items,
				revision: state.cart.revision,
			};
			const dispatch = listenerApi.dispatch as AppDispatch;
			await dispatch(sendCartData(cart, listenerApi.signal));
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
