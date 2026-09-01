import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearPendingCartMutations,
	fetchCartData,
	hasPendingCartMutations,
	LEGACY_PENDING_CART_MUTATIONS_KEY,
	PENDING_CART_MUTATIONS_KEY,
	retryPendingCartMutations,
} from "./cart-actions";
import { cartActions } from "./cart-slice";
import { makeStore } from ".";

const product = { id: "p1", price: 6, title: "My First Book" };

describe("cart synchronization", () => {
	afterEach(() => {
		clearPendingCartMutations();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

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
			mutationId: expect.stringMatching(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			),
			productId: "p1",
		});
		expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
		expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it("keeps a failed optimistic mutation queued for a safe retry", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ message: "unavailable" }), {
					headers: { "Content-Type": "application/json" },
					status: 503,
				})
			);
		vi.stubGlobal("fetch", fetchMock);
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 0 }));

		store.dispatch(cartActions.addItemToCart(product));

		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
		await vi.waitFor(() =>
			expect(store.getState().ui.notification?.title).toBe("Waiting to sync")
		);
		expect(store.getState().cart).toMatchObject({
			items: [{ ...product, quantity: 1 }],
			revision: 1,
		});
		expect(hasPendingCartMutations()).toBe(true);

		const queuedMutation = JSON.parse(
			window.localStorage.getItem(PENDING_CART_MUTATIONS_KEY) ?? "[]"
		)[0];
		fetchMock.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					cart: { items: [{ ...product, quantity: 1 }], revision: 1 },
				}),
				{ headers: { "Content-Type": "application/json" } }
			)
		);
		await store.dispatch(retryPendingCartMutations());

		expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
			delta: queuedMutation.delta,
			mutationId: queuedMutation.mutationId,
			productId: queuedMutation.productId,
		});
		expect(hasPendingCartMutations()).toBe(false);
		expect(store.getState().ui.notification?.title).toBe("Cart synced");
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

	it("applies a ten-second deadline to cart reads and handles timeout failures", async () => {
		const timeoutSignal = new AbortController().signal;
		const timeoutSpy = vi
			.spyOn(AbortSignal, "timeout")
			.mockReturnValue(timeoutSignal);
		const fetchMock = vi
			.fn()
			.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
		vi.stubGlobal("fetch", fetchMock);
		const store = makeStore();

		await store.dispatch(fetchCartData());

		expect(timeoutSpy).toHaveBeenCalledWith(10_000);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/cart",
			expect.objectContaining({ signal: timeoutSignal })
		);
		expect(store.getState().cart.hydrated).toBe(true);
		expect(store.getState().ui.notification).toMatchObject({
			status: "error",
			title: "Cart unavailable",
		});
	});

	it("migrates legacy queued mutations without assuming they are safe to compact", async () => {
		const legacyMutation = {
			delta: 1,
			mutationId: crypto.randomUUID(),
			productId: "p1",
		};
		window.localStorage.setItem(
			LEGACY_PENDING_CART_MUTATIONS_KEY,
			JSON.stringify([legacyMutation])
		);
		vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 0 }));

		await store.dispatch(retryPendingCartMutations());

		expect(
			window.localStorage.getItem(LEGACY_PENDING_CART_MUTATIONS_KEY)
		).toBeNull();
		expect(
			JSON.parse(window.localStorage.getItem(PENDING_CART_MUTATIONS_KEY) ?? "[]")
		).toEqual([{ ...legacyMutation, attempted: true }]);
	});

	it("compacts unsent inverse offline changes", async () => {
		vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 0 }));

		store.dispatch(cartActions.addItemToCart(product));
		await vi.waitFor(() =>
			expect(store.getState().ui.notification?.title).toBe("Waiting to sync")
		);
		expect(hasPendingCartMutations()).toBe(true);

		store.dispatch(cartActions.removeItemFromCart(product.id));

		await vi.waitFor(() => expect(hasPendingCartMutations()).toBe(false));
		await vi.waitFor(() => expect(store.getState().ui.notification).toBeNull());
		expect(fetchMock).not.toHaveBeenCalled();
		expect(store.getState().cart).toMatchObject({ items: [], revision: 2 });
	});

	it("rolls back a change instead of overflowing the bounded offline queue", async () => {
		vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
		window.localStorage.setItem(
			PENDING_CART_MUTATIONS_KEY,
			JSON.stringify(
				Array.from({ length: 256 }, () => ({
					attempted: true,
					delta: 1,
					mutationId: crypto.randomUUID(),
					productId: "p1",
				}))
			)
		);
		const store = makeStore();
		store.dispatch(cartActions.hydrateCart({ items: [], revision: 0 }));

		store.dispatch(cartActions.addItemToCart(product));

		await vi.waitFor(() =>
			expect(store.getState().ui.notification?.title).toBe("Offline queue full")
		);
		expect(store.getState().cart).toMatchObject({ items: [], revision: 0 });
	});
});
