import Providers from "@/app/providers";
import { clearPendingCartMutations } from "@/app/store/cart-actions";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell";

describe("AppShell", () => {
	afterEach(() => {
		clearPendingCartMutations();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("keeps the storefront usable when persistence is unavailable", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		render(
			<Providers>
				<AppShell />
			</Providers>
		);

		expect(
			await screen.findByRole("heading", { name: /favorite book/i })
		).toBeVisible();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t load your saved cart. You can still keep shopping."
		);
	});

	it("keeps an optimistic cart usable while persistence waits to retry", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ cart: { items: [], revision: 0 } }), {
					headers: { "Content-Type": "application/json" },
				})
			)
			.mockRejectedValueOnce(new Error("write unavailable"));
		vi.stubGlobal("fetch", fetchMock);

		render(
			<Providers>
				<AppShell />
			</Providers>
		);

		const addButton = await screen.findAllByRole("button", {
			name: /Add .+ to cart/,
		});
		fireEvent.click(addButton[0]);
		fireEvent.click(screen.getByRole("button", { name: /My Cart/i }));

		const dialog = await screen.findByRole("dialog", {
			name: "Your Shopping Cart",
		});
		expect(
			within(dialog).getByRole("heading", { name: "My First Book" })
		).toBeVisible();
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Your cart is saved on this device. We’ll retry when you’re back online."
		);
		expect(dialog).toBeVisible();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("offers a keyboard shortcut to the main catalog", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ cart: { items: [], revision: 0 } }), {
					headers: { "Content-Type": "application/json" },
				})
			)
		);

		render(
			<Providers>
				<AppShell />
			</Providers>
		);

		expect(screen.getByRole("link", { name: "Skip to book catalog" })).toHaveAttribute(
			"href",
			"#main-content"
		);
		expect(document.querySelector("main")).toHaveAttribute("id", "main-content");
	});
});
