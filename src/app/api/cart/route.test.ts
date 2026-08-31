import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutateCartMock, readCartMock } = vi.hoisted(() => ({
	mutateCartMock: vi.fn(),
	readCartMock: vi.fn(),
}));

vi.mock("@/server/firebase-rest", () => ({
	mutateCart: mutateCartMock,
	readCart: readCartMock,
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(async () => ({
		get: vi.fn(() => ({ value: "b16b00b5-1234-4123-8123-123456789abc" })),
		set: vi.fn(),
	})),
}));

import { GET, PATCH } from "./route";

function mutationRequest(body: string, headers?: HeadersInit): Request {
	return new Request("http://shop.test/api/cart", {
		body,
		headers: {
			"Content-Type": "application/json",
			origin: "http://shop.test",
			...headers,
		},
		method: "PATCH",
	});
}

describe("cart API", () => {
	beforeEach(() => {
		mutateCartMock.mockReset();
		readCartMock.mockReset();
	});

	it("returns the current cart", async () => {
		readCartMock.mockResolvedValue({ items: [], revision: 3 });

		const response = await GET();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ cart: { items: [], revision: 3 } });
		expect(response.headers.get("x-request-id")).toBeTruthy();
	});

	it("applies a validated server-side mutation", async () => {
		mutateCartMock.mockResolvedValue({
			cart: {
				items: [{ id: "p1", price: 6, quantity: 1, title: "My First Book" }],
				revision: 1,
			},
			rateLimited: false,
		});

		const response = await PATCH(
			mutationRequest(JSON.stringify({ delta: 1, productId: "p1" }))
		);

		expect(response.status).toBe(200);
		expect(mutateCartMock).toHaveBeenCalledWith(
			"b16b00b5-1234-4123-8123-123456789abc",
			{ delta: 1, productId: "p1" }
		);
	});

	it("returns a retry hint when the session rate limit is reached", async () => {
		mutateCartMock.mockResolvedValue({
			cart: { items: [], revision: 60 },
			rateLimited: true,
			retryAfter: 12,
		});

		const response = await PATCH(
			mutationRequest(JSON.stringify({ delta: 1, productId: "p1" }))
		);

		expect(response.status).toBe(429);
		expect(response.headers.get("retry-after")).toBe("12");
	});

	it("rejects cross-origin writes", async () => {
		const response = await PATCH(
			mutationRequest(JSON.stringify({ delta: 1, productId: "p1" }), {
				origin: "https://attacker.test",
			})
		);

		expect(response.status).toBe(403);
	});

	it("rejects unsupported content types", async () => {
		const response = await PATCH(
			mutationRequest(JSON.stringify({ delta: 1, productId: "p1" }), {
				"Content-Type": "text/plain",
			})
		);

		expect(response.status).toBe(415);
	});

	it("stops oversized streaming bodies", async () => {
		const response = await PATCH(mutationRequest("x".repeat(2_049)));

		expect(response.status).toBe(413);
	});

	it("rejects invalid JSON and unknown products", async () => {
		const invalidJson = await PATCH(mutationRequest("not-json"));
		const unknownProduct = await PATCH(
			mutationRequest(JSON.stringify({ delta: 1, productId: "unknown" }))
		);

		expect(invalidJson.status).toBe(400);
		expect(unknownProduct.status).toBe(400);
	});
});
