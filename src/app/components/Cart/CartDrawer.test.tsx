import { makeStore } from "@/app/store";
import { uiActions } from "@/app/store/ui-slice";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import CartDrawer from "./CartDrawer";

describe("CartDrawer", () => {
	it("focuses its close control and closes with Escape", () => {
		const store = makeStore();
		store.dispatch(uiActions.toggle());
		const view = render(
			<Provider store={store}>
				<CartDrawer />
			</Provider>
		);

		const closeButton = screen.getByRole("button", {
			name: "Close shopping cart",
		});
		expect(closeButton).toHaveFocus();
		expect(document.body).toHaveClass("cart-drawer-open");

		fireEvent.keyDown(document, { key: "Escape" });
		expect(store.getState().ui.cartIsVisible).toBe(false);

		view.unmount();
		expect(document.body).not.toHaveClass("cart-drawer-open");
	});

	it("closes from its labelled close button", () => {
		const store = makeStore();
		store.dispatch(uiActions.toggle());
		render(
			<Provider store={store}>
				<CartDrawer />
			</Provider>
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Close shopping cart" })
		);
		expect(store.getState().ui.cartIsVisible).toBe(false);
	});

	it("closes from the backdrop without treating drawer interactions as dismissals", () => {
		const store = makeStore();
		store.dispatch(uiActions.toggle());
		render(
			<Provider store={store}>
				<CartDrawer />
			</Provider>
		);

		const dialog = screen.getByRole("dialog", { name: "Your Shopping Cart" });
		fireEvent.mouseDown(dialog);
		expect(store.getState().ui.cartIsVisible).toBe(true);

		fireEvent.mouseDown(dialog.parentElement as HTMLElement);
		expect(store.getState().ui.cartIsVisible).toBe(false);
	});

	it("keeps keyboard focus inside the drawer and restores it on unmount", () => {
		const opener = document.createElement("button");
		opener.textContent = "Open cart";
		document.body.append(opener);
		opener.focus();
		const store = makeStore();
		const view = render(
			<Provider store={store}>
				<CartDrawer />
			</Provider>
		);

		const closeButton = screen.getByRole("button", {
			name: "Close shopping cart",
		});
		const catalogLink = screen.getByRole("link", { name: "Browse the shelf" });
		catalogLink.focus();
		fireEvent.keyDown(document, { key: "Tab" });
		expect(closeButton).toHaveFocus();

		fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
		expect(catalogLink).toHaveFocus();

		view.unmount();
		expect(opener).toHaveFocus();
		opener.remove();
	});
});
