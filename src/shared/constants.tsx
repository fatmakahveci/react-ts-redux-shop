"use client";

import { CartSliceState, Product, UiSliceState } from "@/shared/types";

export const DUMMY_PRODUCTS: Product[] = [
	{
		id: "p1",
		price: 6,
		title: "My First Book",
		description: "The first book I ever wrote",
	},
	{
		id: "p2",
		price: 5,
		title: "My Second Book",
		description: "The second book I ever wrote",
	},
];

export const INITIAL_CART_SLICE_STATE: CartSliceState = {
	items: [],
	totalQuantity: 0,
};

export const INITIAL_UI_SLICE_STATE: UiSliceState = {
	cartIsVisible: false,
	notification: null,
};
