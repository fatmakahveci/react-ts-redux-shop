import { INITIAL_CART_SLICE_STATE } from "@/shared/constants";
import type {
	CartItem,
	CartSliceState,
	PersistedCart,
	Product,
} from "@/shared/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const cartSlice = createSlice({
	name: "cart",
	initialState: INITIAL_CART_SLICE_STATE,
	reducers: {
		addItemToCart(state: CartSliceState, action: PayloadAction<Product>) {
			const newItem: Product = action.payload;
			const existingItem: CartItem | undefined = state.items.find(
				(item: CartItem) => item.id === newItem.id
			);

			if (existingItem?.quantity === 99) {
				return;
			}

			if (!existingItem) {
				state.items.push({
					id: newItem.id,
					price: newItem.price,
					quantity: 1,
					title: newItem.title,
				});
			} else {
				existingItem.quantity++;
			}
			state.revision++;
		},
		removeItemFromCart(
			state: CartSliceState,
			action: PayloadAction<string>
		) {
			const id: string = action.payload;
			const existingItem: CartItem | undefined = state.items.find(
				(item: CartItem) => item.id === id
			);
			if (!existingItem) {
				return;
			}

			if (existingItem.quantity === 1) {
				state.items = state.items.filter(
					(item: CartItem) => item.id !== id
				);
			} else {
				existingItem.quantity--;
			}
			state.revision++;
		},
		hydrateCart(
			state: CartSliceState,
			action: PayloadAction<PersistedCart>
		) {
			state.hydrated = true;
			state.items = action.payload.items;
			state.revision = action.payload.revision;
		},
		markHydrated(state: CartSliceState) {
			state.hydrated = true;
		},
	},
});

export const cartActions = cartSlice.actions;

export default cartSlice.reducer;
