import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();

describe("Firebase REST client", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env.FIREBASE_DATABASE_URL = "https://example.firebaseio.com";
		process.env.FIREBASE_CLIENT_EMAIL = "service-account@example.test";
		process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.FIREBASE_DATABASE_URL;
		delete process.env.FIREBASE_CLIENT_EMAIL;
		delete process.env.FIREBASE_PRIVATE_KEY;
	});

	it("authenticates with a service account and conditionally writes by ETag", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), {
					status: 200,
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], revision: 1 }), {
					headers: { etag: '"revision-1"' },
					status: 200,
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ items: [], revision: 2 }), {
					status: 200,
				})
			);
		vi.stubGlobal("fetch", fetchMock);
		const { writeCartIfNewer } = await import("./firebase-rest");

		const result = await writeCartIfNewer("session-id", {
			items: [],
			revision: 2,
		});

		expect(result.committed).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		const databaseRead = fetchMock.mock.calls[1];
		expect(String(databaseRead[0])).toContain("carts/session-id.json");
		expect((databaseRead[1]?.headers as Record<string, string>).Authorization).toBe(
			"Bearer token"
		);
		const databaseWrite = fetchMock.mock.calls[2];
		expect((databaseWrite[1]?.headers as Record<string, string>)["If-Match"]).toBe(
			'"revision-1"'
		);
	});
});
