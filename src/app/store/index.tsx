"use client";

import CartSliceReducer from "@/app/store/cart-slice";
import UiSliceReducer from "@/app/store/ui-slice";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
	reducer: {
        cart: CartSliceReducer,
		ui: UiSliceReducer
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;