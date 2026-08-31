import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();

const sessionId = "b16b00b5-1234-4123-8123-123456789abc";

function useEmulator(): void {
	delete process.env.FIREBASE_DATABASE_URL;
	delete process.env.FIREBASE_CLIENT_EMAIL;
	delete process.env.FIREBASE_PRIVATE_KEY;
	process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
	process.env.FIREBASE_PROJECT_ID = "demo-redux-cart";
}

describe("Firebase REST client", () => {
	beforeEach(() => {
		vi.resetModules();
		delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
		delete process.env.FIREBASE_PROJECT_ID;
		process.env.FIREBASE_DATABASE_URL = "https://example.firebaseio.com";
		process.env.FIREBASE_CLIENT_EMAIL = "service-account@example.test";
		process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.FIREBASE_DATABASE_URL;
		delete process.env.FIREBASE_CLIENT_EMAIL;
		delete process.env.FIREBASE_PRIVATE_KEY;
		delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
		delete process.env.FIREBASE_PROJECT_ID;
	});

	it("authenticates and stores a canonical server-owned mutation", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }))
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], revision: 1 }), {
					headers: { etag: '"revision-1"' },
				})
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const { mutateCart } = await import("./firebase-rest");

		const result = await mutateCart(sessionId, { delta: 1, productId: "p1" });

		expect(result).toMatchObject({
			cart: {
				items: [{ id: "p1", price: 6, quantity: 1, title: "My First Book" }],
				revision: 2,
			},
			rateLimited: false,
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
		const readHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers);
		expect(readHeaders.get("Authorization")).toBe("Bearer token");
		const write = fetchMock.mock.calls[2];
		expect(new Headers(write[1]?.headers).get("If-Match")).toBe('"revision-1"');
		expect(JSON.parse(write[1]?.body as string)).toMatchObject({
			cart: { items: [{ price: 6, title: "My First Book" }], revision: 2 },
			expiresAt: expect.any(Number),
			rateLimit: { count: 1 },
		});
	});

	it("uses the local demo emulator without service-account credentials", async () => {
		useEmulator();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(null), { headers: { etag: '"null"' } })
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const { mutateCart } = await import("./firebase-rest");

		await mutateCart(sessionId, { delta: 1, productId: "p1" });

		const url = new URL(String(fetchMock.mock.calls[0][0]));
		expect(url.origin).toBe("http://127.0.0.1:9000");
		expect(url.searchParams.get("ns")).toBe("demo-redux-cart");
		expect(
			new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")
		).toBe("Bearer owner");
	});

	it("retries ETag conflicts and preserves the concurrent cart", async () => {
		useEmulator();
		const concurrentCart = {
			cart: {
				items: [{ id: "p1", price: 6, quantity: 1, title: "My First Book" }],
				revision: 1,
			},
			expiresAt: Date.now() + 60_000,
			rateLimit: { count: 1, windowStartedAt: Date.now() },
			updatedAt: Date.now(),
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(null), { headers: { etag: '"null"' } })
			)
			.mockResolvedValueOnce(new Response(null, { status: 412 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify(concurrentCart), {
					headers: { etag: '"revision-1"' },
				})
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const { mutateCart } = await import("./firebase-rest");

		const result = await mutateCart(sessionId, { delta: 1, productId: "p2" });

		expect(fetchMock).toHaveBeenCalledTimes(4);
		expect(result.cart).toMatchObject({
			items: [{ id: "p1" }, { id: "p2" }],
			revision: 2,
		});
	});

	it("canonicalizes legacy stored product fields", async () => {
		useEmulator();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						items: [{ id: "p1", price: 0, quantity: 1, title: "Forged" }],
						revision: 1,
					})
				)
			)
		);
		const { readCart } = await import("./firebase-rest");

		await expect(readCart(sessionId)).resolves.toMatchObject({
			items: [{ price: 6, title: "My First Book" }],
		});
	});

	it("enforces a distributed mutation limit stored with the cart", async () => {
		useEmulator();
		const now = Date.now();
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					cart: { items: [], revision: 60 },
					expiresAt: now + 60_000,
					rateLimit: { count: 60, windowStartedAt: now },
					updatedAt: now,
				}),
				{ headers: { etag: '"revision-60"' } }
			)
		);
		vi.stubGlobal("fetch", fetchMock);
		const { mutateCart } = await import("./firebase-rest");

		const result = await mutateCart(sessionId, { delta: 1, productId: "p1" });

		expect(result.rateLimited).toBe(true);
		expect(result.retryAfter).toBeGreaterThan(0);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("deletes expired cart records in bounded batches", async () => {
		useEmulator();
		const expiredId = "a16b00b5-1234-4123-8123-123456789abc";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ [expiredId]: { expiresAt: 1 } }))
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ expiresAt: 1 }), {
					headers: { etag: '"expired-record"' },
				})
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const { deleteExpiredCarts } = await import("./firebase-rest");

		await expect(deleteExpiredCarts(10, 25)).resolves.toEqual({
			deleted: 1,
			scanned: 1,
		});
		const queryUrl = new URL(String(fetchMock.mock.calls[0][0]));
		expect(queryUrl.searchParams.get("orderBy")).toBe('"expiresAt"');
		expect(queryUrl.searchParams.get("limitToFirst")).toBe("25");
		expect(queryUrl.searchParams.get("startAt")).toBe("0");
		expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
		expect(
			new Headers(fetchMock.mock.calls[2][1]?.headers).get("If-Match")
		).toBe('"expired-record"');
	});
});
