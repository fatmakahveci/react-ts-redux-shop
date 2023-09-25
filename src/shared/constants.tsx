"use client";

import { CartSliceState, UiSliceState } from "@/shared/types";

export const INITIAL_CART_SLICE_STATE: CartSliceState = {
    items: [],
    totalQuantity: 0,
};

export const INITIAL_UI_SLICE_STATE: UiSliceState = {
    cartIsVisible: false,
};
