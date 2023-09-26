"use client";

import { INITIAL_CART_SLICE_STATE } from "@/shared/constants";
import { CartItem, CartSliceState, Product } from "@/shared/types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
	name: "cart",
	initialState: INITIAL_CART_SLICE_STATE,
	reducers: {
		addItemToCart(state: CartSliceState, action: PayloadAction<Product>) {
			const newItem: Product = action.payload;
			const existingItem: CartItem | undefined = state.items.find(
				(item: CartItem) => item.id === newItem.id
			);
			state.totalQuantity++;
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
		removeItemFromCart(
			state: CartSliceState,
			action: PayloadAction<string>
		) {
			const id: string = action.payload;
			const existingItem: CartItem | undefined = state.items.find(
				(item: CartItem) => item.id === id
			);
			state.totalQuantity--;
			if (existingItem) {
				if (existingItem.quantity === 1) {
					state.items = state.items.filter(
						(item: CartItem) => item.id !== id
					);
				} else {
					existingItem.quantity--;
					existingItem.total -= existingItem.price;
				}
			}
		},
		replaceCart(
			state: CartSliceState,
			action: PayloadAction<CartSliceState>
		) {
			state.totalQuantity = action.payload.totalQuantity;
			state.items = action.payload.items;
		},
	},
});

export const cartActions = cartSlice.actions;

export default cartSlice.reducer;
