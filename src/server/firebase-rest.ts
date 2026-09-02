import { createSign } from "node:crypto";
import {
	MUTATION_ID_PATTERN,
	validatePersistedCart,
} from "@/shared/cart-schema";
import { getProduct, MAX_CART_REVISION } from "@/shared/constants";
import type { CartMutation, PersistedCart } from "@/shared/types";

type ProductionFirebaseEnvironment = {
	mode: "production";
	databaseURL: URL;
	clientEmail: string;
	privateKey: string;
};

type EmulatorFirebaseEnvironment = {
	mode: "emulator";
	databaseURL: URL;
	namespace: string;
};

type FirebaseEnvironment =
	| ProductionFirebaseEnvironment
	| EmulatorFirebaseEnvironment;

type AccessToken = {
	expiresAt: number;
	value: string;
};

type StoredCart = {
	cart: PersistedCart;
	expiresAt: number;
	processedMutationIds: Record<string, number>;
	rateLimit: {
		count: number;
		windowStartedAt: number;
	};
	updatedAt: number;
};

export type CartMutationResult = {
	cart: PersistedCart;
	rateLimited: boolean;
	retryAfter?: number;
};

const CART_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const DATABASE_TIMEOUT_MS = 8_000;
const MUTATION_LIMIT = 60;
const PROCESSED_MUTATION_LIMIT = 256;
const RATE_LIMIT_WINDOW_MS = 60_000;
const TOKEN_TIMEOUT_MS = 5_000;

let cachedToken: AccessToken | undefined;
let pendingToken: Promise<AccessToken> | undefined;

function readFirebaseEnvironment(): FirebaseEnvironment {
	const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
	if (emulatorHost) {
		if (emulatorHost.includes("://")) {
			throw new Error(
				"Firebase emulator host must not include a URL protocol."
			);
		}

		const databaseURL = new URL(`http://${emulatorHost}`);
		if (
			!["127.0.0.1", "localhost"].includes(databaseURL.hostname) ||
			!databaseURL.port ||
			databaseURL.pathname !== "/" ||
			databaseURL.search ||
			databaseURL.hash ||
			databaseURL.username ||
			databaseURL.password
		) {
			throw new Error(
				"Firebase emulator must use a localhost host and explicit port."
			);
		}

		const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-redux-cart";
		if (!/^demo-[a-z0-9-]+$/.test(projectId)) {
			throw new Error("Firebase emulator project ID must start with demo-.");
		}
		const namespace = `${projectId}-default-rtdb`;

		return { databaseURL, mode: "emulator", namespace };
	}

	const databaseURL = process.env.FIREBASE_DATABASE_URL;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

	if (!databaseURL || !clientEmail || !privateKey) {
		throw new Error("Firebase service-account environment variables are incomplete.");
	}

	const parsedDatabaseURL = new URL(databaseURL);
	const isFirebaseHost = [".firebaseio.com", ".firebasedatabase.app"].some(
		(suffix) => parsedDatabaseURL.hostname.endsWith(suffix)
	);
	if (
		parsedDatabaseURL.protocol !== "https:" ||
		!isFirebaseHost ||
		parsedDatabaseURL.port ||
		parsedDatabaseURL.pathname !== "/" ||
		parsedDatabaseURL.search ||
		parsedDatabaseURL.hash ||
		parsedDatabaseURL.username ||
		parsedDatabaseURL.password
	) {
		throw new Error("Firebase database URL must be a canonical HTTPS endpoint.");
	}

	return {
		databaseURL: parsedDatabaseURL,
		clientEmail,
		mode: "production",
		privateKey,
	};
}

function encodeJson(value: unknown): string {
	return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function requestAccessToken(): Promise<AccessToken> {
	const environment = readFirebaseEnvironment();
	if (environment.mode !== "production") {
		throw new Error("Firebase access tokens are only used in production mode.");
	}

	const issuedAt = Math.floor(Date.now() / 1_000);
	const unsignedToken = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
		aud: "https://oauth2.googleapis.com/token",
		exp: issuedAt + 3_600,
		iat: issuedAt,
		iss: environment.clientEmail,
		scope:
			"https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
	})}`;
	const signature = createSign("RSA-SHA256")
		.update(unsignedToken)
		.sign(environment.privateKey, "base64url");
	const response = await fetch("https://oauth2.googleapis.com/token", {
		body: new URLSearchParams({
			assertion: `${unsignedToken}.${signature}`,
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		}),
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		method: "POST",
		signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error("Unable to obtain a Firebase access token.");
	}

	const body = (await response.json()) as Record<string, unknown>;
	if (
		typeof body.access_token !== "string" ||
		typeof body.expires_in !== "number"
	) {
		throw new Error("Firebase token response is invalid.");
	}

	return {
		expiresAt: Date.now() + body.expires_in * 1_000,
		value: body.access_token,
	};
}

async function getAccessToken(): Promise<string> {
	if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
		return cachedToken.value;
	}

	pendingToken ??= requestAccessToken();
	try {
		cachedToken = await pendingToken;
		return cachedToken.value;
	} finally {
		pendingToken = undefined;
	}
}

async function firebaseRequest(
	path: string,
	init: RequestInit = {},
	query?: Record<string, string>
): Promise<Response> {
	const environment = readFirebaseEnvironment();
	const url = new URL(
		path,
		`${environment.databaseURL.toString().replace(/\/$/, "")}/`
	);
	if (environment.mode === "emulator") {
		url.searchParams.set("ns", environment.namespace);
	}
	for (const [key, value] of Object.entries(query ?? {})) {
		url.searchParams.set(key, value);
	}

	const token =
		environment.mode === "emulator" ? "owner" : await getAccessToken();
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${token}`);
	const timeoutSignal = AbortSignal.timeout(DATABASE_TIMEOUT_MS);
	const signal = init.signal
		? AbortSignal.any([init.signal, timeoutSignal])
		: timeoutSignal;

	return fetch(url, { ...init, headers, signal });
}

function emptyCart(): PersistedCart {
	return { items: [], revision: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseStoredCart(raw: unknown, now: number): Promise<StoredCart> {
	if (!raw) {
		return {
			cart: emptyCart(),
			expiresAt: now + CART_TTL_MS,
			processedMutationIds: {},
			rateLimit: { count: 0, windowStartedAt: now },
			updatedAt: now,
		};
	}

	const wrapped = isRecord(raw) && "cart" in raw;
	const rawCart = wrapped ? raw.cart : raw;
	const normalizedCart =
		isRecord(rawCart) &&
		!("items" in rawCart) &&
		typeof rawCart.revision === "number"
			? { ...rawCart, items: [] }
			: rawCart;
	const cart = await validatePersistedCart(normalizedCart);
	const expiresAt =
		wrapped && typeof raw.expiresAt === "number"
			? raw.expiresAt
			: now + CART_TTL_MS;
	const rateLimitValue = wrapped && isRecord(raw.rateLimit) ? raw.rateLimit : {};
	const processedMutationValue =
		wrapped && isRecord(raw.processedMutationIds)
			? raw.processedMutationIds
			: {};
	const processedMutationIds = Object.fromEntries(
		Object.entries(processedMutationValue)
			.filter(
				(entry): entry is [string, number] =>
					MUTATION_ID_PATTERN.test(entry[0]) &&
					typeof entry[1] === "number" &&
					Number.isSafeInteger(entry[1]) &&
					entry[1] >= 0
			)
			.sort((first, second) => second[1] - first[1])
			.slice(0, PROCESSED_MUTATION_LIMIT)
	);
	const count =
		typeof rateLimitValue.count === "number" &&
		Number.isSafeInteger(rateLimitValue.count) &&
		rateLimitValue.count >= 0
			? rateLimitValue.count
			: 0;
	const windowStartedAt =
		typeof rateLimitValue.windowStartedAt === "number" &&
		Number.isSafeInteger(rateLimitValue.windowStartedAt)
			? rateLimitValue.windowStartedAt
			: now;

	return {
		cart: expiresAt <= now ? emptyCart() : cart,
		expiresAt,
		processedMutationIds,
		rateLimit: { count, windowStartedAt },
		updatedAt:
			wrapped && typeof raw.updatedAt === "number" ? raw.updatedAt : now,
	};
}

function cartPath(sessionId: string): string {
	return `carts/${encodeURIComponent(sessionId)}.json`;
}

function recordProcessedMutation(
	processedMutationIds: Record<string, number>,
	mutationId: string,
	now: number
): Record<string, number> {
	return Object.fromEntries(
		[
			...Object.entries(processedMutationIds),
			[mutationId, now] as const,
		]
			.sort((first, second) => second[1] - first[1])
			.slice(0, PROCESSED_MUTATION_LIMIT)
	);
}

export async function readCart(sessionId: string): Promise<PersistedCart> {
	const response = await firebaseRequest(cartPath(sessionId), {
		cache: "no-store",
	});
	if (!response.ok) throw new Error("Unable to read Firebase cart.");

	const stored = await parseStoredCart(await response.json(), Date.now());
	return stored.cart;
}

export async function mutateCart(
	sessionId: string,
	mutation: CartMutation
): Promise<CartMutationResult> {
	const product = getProduct(mutation.productId);
	if (!product) throw new Error("Unknown product mutation.");

	for (let attempt = 0; attempt < 8; attempt++) {
		const now = Date.now();
		const currentResponse = await firebaseRequest(cartPath(sessionId), {
			cache: "no-store",
			headers: { "X-Firebase-ETag": "true" },
		});
		if (!currentResponse.ok) throw new Error("Unable to read Firebase cart.");

		const etag = currentResponse.headers.get("etag");
		if (!etag) throw new Error("Firebase did not provide an ETag.");
		const stored = await parseStoredCart(await currentResponse.json(), now);
		if (mutation.mutationId in stored.processedMutationIds) {
			return { cart: stored.cart, rateLimited: false };
		}
		const withinWindow =
			now - stored.rateLimit.windowStartedAt < RATE_LIMIT_WINDOW_MS;
		const count = withinWindow ? stored.rateLimit.count : 0;
		const windowStartedAt = withinWindow
			? stored.rateLimit.windowStartedAt
			: now;

		if (count >= MUTATION_LIMIT) {
			return {
				cart: stored.cart,
				rateLimited: true,
				retryAfter: Math.max(
					1,
					Math.ceil(
						(windowStartedAt + RATE_LIMIT_WINDOW_MS - now) / 1_000
					)
				),
			};
		}

		if (stored.cart.revision >= MAX_CART_REVISION) {
			throw new Error("Cart revision limit reached.");
		}

		const items = stored.cart.items.map((item) => ({ ...item }));
		const existingItem = items.find((item) => item.id === product.id);
		if (mutation.delta === 1 && !existingItem) {
			items.push({
				id: product.id,
				price: product.price,
				quantity: 1,
				title: product.title,
			});
		} else if (
			mutation.delta === 1 &&
			existingItem &&
			existingItem.quantity < 99
		) {
			existingItem.quantity++;
		} else if (mutation.delta === -1 && existingItem?.quantity === 1) {
			items.splice(items.indexOf(existingItem), 1);
		} else if (mutation.delta === -1 && existingItem) {
			existingItem.quantity--;
		}

		const cart: PersistedCart = {
			items,
			revision: stored.cart.revision + 1,
		};
		const nextStored: StoredCart = {
			cart,
			expiresAt: now + CART_TTL_MS,
			processedMutationIds: recordProcessedMutation(
				stored.processedMutationIds,
				mutation.mutationId,
				now
			),
			rateLimit: { count: count + 1, windowStartedAt },
			updatedAt: now,
		};
		const writeResponse = await firebaseRequest(cartPath(sessionId), {
			body: JSON.stringify(nextStored),
			headers: {
				"Content-Type": "application/json",
				"If-Match": etag,
			},
			method: "PUT",
		});
		if (writeResponse.status === 412) continue;
		if (!writeResponse.ok) throw new Error("Unable to write Firebase cart.");

		return { cart, rateLimited: false };
	}

	throw new Error("Firebase cart remained contested after several retries.");
}

export async function clearCart(
	sessionId: string,
	mutationId: string
): Promise<CartMutationResult> {
	for (let attempt = 0; attempt < 8; attempt++) {
		const now = Date.now();
		const currentResponse = await firebaseRequest(cartPath(sessionId), {
			cache: "no-store",
			headers: { "X-Firebase-ETag": "true" },
		});
		if (!currentResponse.ok) throw new Error("Unable to read Firebase cart.");

		const etag = currentResponse.headers.get("etag");
		if (!etag) throw new Error("Firebase did not provide an ETag.");
		const stored = await parseStoredCart(await currentResponse.json(), now);
		if (mutationId in stored.processedMutationIds) {
			return { cart: stored.cart, rateLimited: false };
		}
		const withinWindow =
			now - stored.rateLimit.windowStartedAt < RATE_LIMIT_WINDOW_MS;
		const count = withinWindow ? stored.rateLimit.count : 0;
		const windowStartedAt = withinWindow
			? stored.rateLimit.windowStartedAt
			: now;

		if (count >= MUTATION_LIMIT) {
			return {
				cart: stored.cart,
				rateLimited: true,
				retryAfter: Math.max(
					1,
					Math.ceil(
						(windowStartedAt + RATE_LIMIT_WINDOW_MS - now) / 1_000
					)
				),
			};
		}
		if (stored.cart.revision >= MAX_CART_REVISION) {
			throw new Error("Cart revision limit reached.");
		}

		const cart: PersistedCart = {
			items: [],
			revision: stored.cart.revision + 1,
		};
		const nextStored: StoredCart = {
			cart,
			expiresAt: now + CART_TTL_MS,
			processedMutationIds: recordProcessedMutation(
				stored.processedMutationIds,
				mutationId,
				now
			),
			rateLimit: { count: count + 1, windowStartedAt },
			updatedAt: now,
		};
		const writeResponse = await firebaseRequest(cartPath(sessionId), {
			body: JSON.stringify(nextStored),
			headers: {
				"Content-Type": "application/json",
				"If-Match": etag,
			},
			method: "PUT",
		});
		if (writeResponse.status === 412) continue;
		if (!writeResponse.ok) throw new Error("Unable to clear Firebase cart.");

		return { cart, rateLimited: false };
	}

	throw new Error("Firebase cart remained contested after several retries.");
}

export async function deleteExpiredCarts(
	now = Date.now(),
	limit = 100
): Promise<{ deleted: number; scanned: number }> {
	const response = await firebaseRequest(
		"carts.json",
		{ cache: "no-store" },
		{
			endAt: String(now),
			limitToFirst: String(limit),
			orderBy: JSON.stringify("expiresAt"),
			startAt: "0",
		}
	);
	if (!response.ok) throw new Error("Unable to query expired Firebase carts.");

	const raw = await response.json();
	if (!isRecord(raw)) return { deleted: 0, scanned: 0 };
	const candidateIds = Object.keys(raw).filter((id) =>
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			id
		)
	);
	let deleted = 0;
	for (let offset = 0; offset < candidateIds.length; offset += 10) {
		const batch = candidateIds.slice(offset, offset + 10);
		const results = await Promise.all(
			batch.map(async (id) => {
				const currentResponse = await firebaseRequest(cartPath(id), {
					cache: "no-store",
					headers: { "X-Firebase-ETag": "true" },
				});
				if (!currentResponse.ok) {
					throw new Error("Unable to re-check an expired Firebase cart.");
				}
				const etag = currentResponse.headers.get("etag");
				const current = await currentResponse.json();
				if (
					!etag ||
					!isRecord(current) ||
					typeof current.expiresAt !== "number" ||
					current.expiresAt > now
				) {
					return false;
				}

				const deleteResponse = await firebaseRequest(cartPath(id), {
					headers: { "If-Match": etag },
					method: "DELETE",
				});
				if (deleteResponse.status === 412) return false;
				if (!deleteResponse.ok) {
					throw new Error("Unable to delete an expired Firebase cart.");
				}
				return true;
			})
		);
		deleted += results.filter(Boolean).length;
	}
	return { deleted, scanned: candidateIds.length };
}
