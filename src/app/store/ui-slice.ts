import { INITIAL_UI_SLICE_STATE } from "@/shared/constants";
import type { NotificationProps, UiSliceState } from "@/shared/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const uiSlice = createSlice({
	name: "user_interface",
	initialState: INITIAL_UI_SLICE_STATE,
	reducers: {
		closeCart(state: UiSliceState) {
			state.cartIsVisible = false;
		},
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
		hideNotification(state: UiSliceState) {
			state.notification = null;
		},
	},
});

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;
