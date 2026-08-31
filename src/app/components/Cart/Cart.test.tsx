import { makeStore } from "@/app/store";
import { cartActions } from "@/app/store/cart-slice";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import Cart from "./Cart";

describe("Cart", () => {
	it("summarizes items and free-shipping progress", () => {
		const store = makeStore();
		store.dispatch(
			cartActions.hydrateCart({
				items: [
					{ id: "p1", price: 6, quantity: 2, title: "My First Book" },
					{ id: "p3", price: 12.5, quantity: 1, title: "The Green Path" },
				],
				revision: 3,
			})
		);

		render(
			<Provider store={store}>
				<Cart />
			</Provider>
		);

		expect(screen.getByText("3 items")).toBeVisible();
		expect(screen.getByText("$10.50 away from free shipping")).toBeVisible();
		expect(screen.getByText("$24.50")).toBeVisible();
		expect(screen.getByRole("progressbar")).toHaveAttribute("value", "24.5");
		const checkoutButton = screen.getByRole("button", {
			name: /checkout securely/i,
		});
		expect(checkoutButton).toBeEnabled();
		fireEvent.click(checkoutButton);
		expect(
			screen.getByRole("heading", { name: "Delivery details" })
		).toBeVisible();
	});

	it("offers a catalog link when empty", () => {
		const store = makeStore();
		store.dispatch({ type: "ui/toggle" });
		render(
			<Provider store={store}>
				<Cart />
			</Provider>
		);

		expect(screen.getByText(/ready for a good story/i)).toBeVisible();
		expect(screen.getByRole("link", { name: "Browse the shelf" })).toHaveAttribute(
			"href",
			"#catalog"
		);
		fireEvent.click(screen.getByRole("link", { name: "Browse the shelf" }));
		expect(store.getState().ui.cartIsVisible).toBe(false);
	});
});
