import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCartData } from "./cart-actions";
import { cartActions } from "./cart-slice";
import { makeStore } from ".";

const product = { id: "p1", price: 6, title: "My First Book" };

describe("cart synchronization", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("sends server-owned atomic mutations for every local change", async () => {
		let resolveFirstRequest!: (response: Response) => void;
		const firstRequest = new Promise<Response>((resolve) => {
			resolveFirstRequest = resolve;
		});
		const fetchMock = vi
			.fn()
			.mockReturnValueOnce(firstRequest)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						cart: { items: [{ ...product, quantity: 2 }], revision: 2 },
					}),
					{ headers: { "Content-Type": "application/json" }, status: 200 }
				)
			);
		vi.stubGlobal("fetch", fetchMock);
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 0 }));

		store.dispatch(cartActions.addItemToCart(product));
		store.dispatch(cartActions.addItemToCart(product));
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		resolveFirstRequest(
			new Response(
				JSON.stringify({
					cart: { items: [{ ...product, quantity: 1 }], revision: 1 },
				}),
				{ headers: { "Content-Type": "application/json" }, status: 200 }
			)
		);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

		expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
			delta: 1,
			productId: "p1",
		});
		expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
		expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it("restores the authoritative cart after a failed optimistic mutation", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: "unavailable" }), {
					headers: { "Content-Type": "application/json" },
					status: 503,
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ cart: { items: [], revision: 0 } }), {
					headers: { "Content-Type": "application/json" },
					status: 200,
				})
			);
		vi.stubGlobal("fetch", fetchMock);
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 0 }));

		store.dispatch(cartActions.addItemToCart(product));

		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		await vi.waitFor(() =>
			expect(store.getState().ui.notification?.status).toBe("error")
		);
		expect(store.getState().cart).toMatchObject({ items: [], revision: 0 });
		expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: "no-store" });
	});

	it("ignores stale mutation responses", () => {
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 5 }));

		store.dispatch(
			cartActions.reconcileCart({
				items: [{ ...product, quantity: 1 }],
				revision: 4,
			})
		);

		expect(store.getState().cart).toMatchObject({ items: [], revision: 5 });
	});

	it("unblocks the storefront and reports an error when hydration fails", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		const store = makeStore();

		await store.dispatch(fetchCartData());

		expect(store.getState().cart.hydrated).toBe(true);
		expect(store.getState().ui.notification?.status).toBe("error");
	});
});
