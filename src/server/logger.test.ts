import { afterEach, describe, expect, it, vi } from "vitest";
import { logServerError } from "./logger";

describe("server logger", () => {
	afterEach(() => vi.restoreAllMocks());

	it("emits structured errors with a request ID", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		logServerError("cart.test.failed", new Error("failure"), "request-123");

		const entry = JSON.parse(String(consoleError.mock.calls[0][0]));
		expect(entry).toMatchObject({
			error: { name: "Error" },
			event: "cart.test.failed",
			level: "error",
			requestId: "request-123",
		});
		expect(JSON.stringify(entry)).not.toContain("failure");
		expect(entry.timestamp).toBeTruthy();
	});

	it("does not serialize arbitrary non-error values", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		logServerError("cart.test.failed", { secret: "hidden" }, "request-456");

		const entry = JSON.parse(String(consoleError.mock.calls[0][0]));
		expect(entry.error).toEqual({ name: "UnknownError" });
		expect(JSON.stringify(entry)).not.toContain("hidden");
	});
});
