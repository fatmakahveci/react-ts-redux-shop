import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

describe("CSP proxy", () => {
	it("adds a unique nonce without allowing inline scripts", () => {
		const response = proxy(new NextRequest("http://shop.test/"));
		const csp = response.headers.get("content-security-policy");

		expect(csp).toContain("script-src 'self' 'nonce-");
		expect(csp).toContain("'strict-dynamic'");
		expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
		expect(csp).toContain("frame-ancestors 'none'");
	});
});
