import { INITIAL_CART_SLICE_STATE } from "@/shared/constants";
import type { Product } from "@/shared/types";
import { describe, expect, it } from "vitest";
import cartReducer, { cartActions } from "./cart-slice";

const product: Product = {
	id: "book-1",
	price: 6,
	title: "A Book",
};

describe("cartSlice", () => {
	it("adds a new item and increments its revision", () => {
		const state = cartReducer(
			INITIAL_CART_SLICE_STATE,
			cartActions.addItemToCart(product)
		);

		expect(state.items).toEqual([{ ...product, quantity: 1 }]);
		expect(state.revision).toBe(1);
	});

	it("does not change state when removing an unknown item", () => {
		const state = cartReducer(
			INITIAL_CART_SLICE_STATE,
			cartActions.removeItemFromCart("missing")
		);

		expect(state).toEqual(INITIAL_CART_SLICE_STATE);
	});

	it("removes an item when its quantity reaches zero", () => {
		const withItem = cartReducer(
			INITIAL_CART_SLICE_STATE,
			cartActions.addItemToCart(product)
		);
		const state = cartReducer(
			withItem,
			cartActions.removeItemFromCart(product.id)
		);

		expect(state.items).toEqual([]);
		expect(state.revision).toBe(2);
	});

	it("hydrates without creating a local cart mutation", () => {
		const state = cartReducer(
			INITIAL_CART_SLICE_STATE,
			cartActions.hydrateCart({
				items: [{ ...product, quantity: 2 }],
				revision: 8,
			})
		);

		expect(state.hydrated).toBe(true);
		expect(state.revision).toBe(8);
	});

	it("caps item quantities at 99", () => {
		let state = INITIAL_CART_SLICE_STATE;
		for (let index = 0; index < 105; index++) {
			state = cartReducer(state, cartActions.addItemToCart(product));
		}

		expect(state.items[0].quantity).toBe(99);
		expect(state.revision).toBe(99);
	});
});
