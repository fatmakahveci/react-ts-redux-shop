import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCartData } from "./cart-actions";
import { cartActions } from "./cart-slice";
import { makeStore } from ".";

const product = { id: "p1", price: 6, title: "Book" };

describe("cart synchronization", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("debounces rapid mutations and persists only the latest revision", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ cart: { items: [], revision: 2 } }), {
				headers: { "Content-Type": "application/json" },
				status: 200,
			})
		);
		vi.stubGlobal("fetch", fetchMock);
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 0 }));

		store.dispatch(cartActions.addItemToCart(product));
		store.dispatch(cartActions.addItemToCart(product));
		await vi.advanceTimersByTimeAsync(450);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const request = fetchMock.mock.calls[0][1] as RequestInit;
		expect(JSON.parse(request.body as string)).toMatchObject({
			items: [{ quantity: 2 }],
			revision: 2,
		});
	});

	it("unblocks the storefront and reports an error when hydration fails", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		const store = makeStore();

		await store.dispatch(fetchCartData());

		expect(store.getState().cart.hydrated).toBe(true);
		expect(store.getState().ui.notification?.status).toBe("error");
	});
});
