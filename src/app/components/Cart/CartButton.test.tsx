import { cartActions } from "@/app/store/cart-slice";
import { makeStore } from "@/app/store";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import CartButton from "./CartButton";

describe("CartButton", () => {
	it("shows derived quantity and exposes its expanded state", () => {
		const store = makeStore();
		store.dispatch(
			cartActions.hydrateCart({
				items: [{ id: "p1", price: 6, quantity: 2, title: "Book" }],
				revision: 3,
			})
		);

		render(
			<Provider store={store}>
				<CartButton />
			</Provider>
		);

		const button = screen.getByRole("button", { name: /my cart/i });
		expect(button).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByLabelText("2 items")).toHaveTextContent("2");

		fireEvent.click(button);
		expect(button).toHaveAttribute("aria-expanded", "true");
	});
});
