import { describe, expect, it } from "vitest";
import { validatePersistedCart } from "./cart-schema";

describe("validatePersistedCart", () => {
	it("accepts a valid persisted cart", async () => {
		await expect(
			validatePersistedCart({
				items: [{ id: "p1", price: 6, quantity: 2, title: "Book" }],
				revision: 4,
			})
		).resolves.toMatchObject({ revision: 4 });
	});

	it.each([
		null,
		{ items: [], revision: -1 },
		{ items: [{ id: "p1", price: "6", quantity: 1, title: "Book" }], revision: 1 },
		{ items: [{ id: "p1", price: 6, quantity: 0, title: "Book" }], revision: 1 },
	])("rejects malformed cart data", async (cart) => {
		await expect(validatePersistedCart(cart)).rejects.toBeDefined();
	});
});
