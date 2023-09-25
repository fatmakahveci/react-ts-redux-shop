"use client";

import { createSlice } from "@reduxjs/toolkit";
import { INITIAL_UI_SLICE_STATE } from "@/shared/constants";

const uiSlice = createSlice({
	name: "user_interface",
	initialState: INITIAL_UI_SLICE_STATE,
	reducers: {
        toggle(state) {
            state.cartIsVisible = !state.cartIsVisible;
        },
	},
});

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;