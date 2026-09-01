import { makeStore } from "@/app/store";
import { cartActions } from "@/app/store/cart-slice";
import {
	clearPendingCartMutations,
	queueCartMutation,
} from "@/app/store/cart-actions";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout";

describe("Checkout", () => {
	afterEach(() => {
		clearPendingCartMutations();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("places a demo order and clears the hydrated cart", async () => {
		const store = makeStore();
		store.dispatch(
			cartActions.hydrateCart({
				items: [{ id: "p1", price: 6, quantity: 1, title: "My First Book" }],
				revision: 1,
			})
		);
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ cart: { items: [], revision: 2 } }), {
					headers: { "Content-Type": "application/json" },
				})
			)
		);

		render(
			<Provider store={store}>
				<Checkout itemCount={1} onBack={vi.fn()} subtotal={6} />
			</Provider>
		);
		fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), {
			target: { value: "Ada Reader" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
			target: { value: "ada@example.test" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "Street address" }), {
			target: { value: "1 Library Lane" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "City" }), {
			target: { value: "London" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "Postal code" }), {
			target: { value: "N1 1AA" },
		});
		fireEvent.click(screen.getByRole("button", { name: /place order/i }));

		await waitFor(() => {
			const confirmationHeading = screen.getByRole("heading", {
				name: "Thank you for your order",
			});
			expect(confirmationHeading).toBeVisible();
			expect(confirmationHeading).toHaveFocus();
		});
		expect(store.getState().cart.items).toEqual([]);
		expect(fetch).toHaveBeenCalledWith(
			"/api/cart",
			expect.objectContaining({ method: "DELETE" })
		);
	});

	it("does not place an order while offline cart changes are unsynced", async () => {
		const store = makeStore();
		store.dispatch(
			cartActions.hydrateCart({
				items: [{ id: "p1", price: 6, quantity: 1, title: "My First Book" }],
				revision: 1,
			})
		);
		vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await store.dispatch(queueCartMutation({ delta: 1, productId: "p1" }));

		render(
			<Provider store={store}>
				<Checkout itemCount={1} onBack={vi.fn()} subtotal={6} />
			</Provider>
		);
		for (const [name, value] of [
			["Full name", "Ada Reader"],
			["Email", "ada@example.test"],
			["Street address", "1 Library Lane"],
			["City", "London"],
			["Postal code", "N1 1AA"],
		] as const) {
			fireEvent.change(screen.getByRole("textbox", { name }), {
				target: { value },
			});
		}
		fireEvent.click(screen.getByRole("button", { name: /place order/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t place your order. Please try again."
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reuses the same checkout idempotency key after a lost response", async () => {
		const store = makeStore();
		store.dispatch(
			cartActions.hydrateCart({
				items: [{ id: "p1", price: 6, quantity: 1, title: "My First Book" }],
				revision: 1,
			})
		);
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error("response lost"))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ cart: { items: [], revision: 2 } }), {
					headers: { "Content-Type": "application/json" },
				})
			);
		vi.stubGlobal("fetch", fetchMock);
		render(
			<Provider store={store}>
				<Checkout itemCount={1} onBack={vi.fn()} subtotal={6} />
			</Provider>
		);
		for (const [name, value] of [
			["Full name", "Ada Reader"],
			["Email", "ada@example.test"],
			["Street address", "1 Library Lane"],
			["City", "London"],
			["Postal code", "N1 1AA"],
		] as const) {
			fireEvent.change(screen.getByRole("textbox", { name }), {
				target: { value },
			});
		}

		fireEvent.click(screen.getByRole("button", { name: /place order/i }));
		await screen.findByRole("alert");
		fireEvent.click(screen.getByRole("button", { name: /place order/i }));
		await screen.findByRole("heading", { name: "Thank you for your order" });

		const idempotencyKeys = fetchMock.mock.calls.map((call) =>
			new Headers(call[1]?.headers).get("Idempotency-Key")
		);
		expect(idempotencyKeys[0]).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
		expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
	});
});
