"use client";

import { INITIAL_UI_SLICE_STATE } from "@/shared/constants";
import { NotificationProps, UiSliceState } from "@/shared/types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
	name: "user_interface",
	initialState: INITIAL_UI_SLICE_STATE,
	reducers: {
		toggle(state: UiSliceState) {
			state.cartIsVisible = !state.cartIsVisible;
		},
		showNotification(
			state: UiSliceState,
			action: PayloadAction<NotificationProps>
		) {
			state.notification = {
				message: action.payload.message,
				status: action.payload.status,
				title: action.payload.title,
			};
		},
	},
});

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;
