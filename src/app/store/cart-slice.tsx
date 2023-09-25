"use client";

import { INITIAL_CART_SLICE_STATE } from "@/shared/constants";
import { CartItem, CartSliceState } from "@/shared/types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
	name: "cart",
	initialState: INITIAL_CART_SLICE_STATE,
	reducers: {
		addItemToCart(state: CartSliceState, action: PayloadAction<CartItem>) {
			const newItem: CartItem = action.payload;
			const existingItem: CartItem | undefined = state.items.find(
				(item: CartItem) => item.id === item.id
			);
			if (!existingItem) {
				state.items.push({
					id: newItem.id,
					price: newItem.price,
					quantity: 1,
					title: newItem.title,
					total: newItem.price,
				});
			} else {
					existingItem.quantity++;
					existingItem.total += newItem.price;
			}
		},
		removeItemFromCart() {},
	},
});

export const cartActions = cartSlice.actions;

export default cartSlice.reducer;
