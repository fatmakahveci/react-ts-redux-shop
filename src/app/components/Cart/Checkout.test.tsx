import { makeStore } from "@/app/store";
import { cartActions } from "@/app/store/cart-slice";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout";

describe("Checkout", () => {
	afterEach(() => vi.unstubAllGlobals());

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
			expect(
				screen.getByRole("heading", { name: "Thank you for your order" })
			).toBeVisible();
		});
		expect(store.getState().cart.items).toEqual([]);
		expect(fetch).toHaveBeenCalledWith(
			"/api/cart",
			expect.objectContaining({ method: "DELETE" })
		);
	});
});
