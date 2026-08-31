import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteExpiredCartsMock } = vi.hoisted(() => ({
	deleteExpiredCartsMock: vi.fn(),
}));

vi.mock("@/server/firebase-rest", () => ({
	deleteExpiredCarts: deleteExpiredCartsMock,
}));

import { POST } from "./route";

describe("expired cart cleanup API", () => {
	beforeEach(() => {
		process.env.CRON_SECRET = "a-long-random-test-secret-123456789";
		deleteExpiredCartsMock.mockReset();
	});

	afterEach(() => {
		delete process.env.CRON_SECRET;
	});

	it("rejects missing or incorrect credentials", async () => {
		const response = await POST(
			new Request("http://shop.test/api/internal/cleanup-carts", {
				method: "POST",
			})
		);

		expect(response.status).toBe(401);
		expect(deleteExpiredCartsMock).not.toHaveBeenCalled();
	});

	it("deletes expired carts with a valid bearer secret", async () => {
		deleteExpiredCartsMock.mockResolvedValue({ deleted: 7, scanned: 7 });

		const response = await POST(
			new Request("http://shop.test/api/internal/cleanup-carts", {
				headers: {
					Authorization: "Bearer a-long-random-test-secret-123456789",
				},
				method: "POST",
			})
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ deleted: 7 });
	});
});
