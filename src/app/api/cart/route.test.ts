import { describe, expect, it } from "vitest";
import { PUT } from "./route";

describe("cart API request guards", () => {
	it("rejects cross-origin writes", async () => {
		const response = await PUT(
			new Request("http://shop.test/api/cart", {
				body: JSON.stringify({ items: [], revision: 1 }),
				headers: { host: "shop.test", origin: "https://attacker.test" },
				method: "PUT",
			})
		);

		expect(response.status).toBe(403);
	});

	it("rejects oversized writes even without a content-length header", async () => {
		const response = await PUT(
			new Request("http://shop.test/api/cart", {
				body: "x".repeat(50_001),
				headers: { host: "shop.test", origin: "http://shop.test" },
				method: "PUT",
			})
		);

		expect(response.status).toBe(413);
	});

	it("rejects invalid JSON", async () => {
		const response = await PUT(
			new Request("http://shop.test/api/cart", {
				body: "not-json",
				headers: { host: "shop.test", origin: "http://shop.test" },
				method: "PUT",
			})
		);

		expect(response.status).toBe(400);
	});
});
