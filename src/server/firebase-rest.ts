import { createSign } from "node:crypto";
import type { PersistedCart } from "@/shared/types";

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

type ConditionalWriteResult = {
	committed: boolean;
	current: unknown;
};

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

		const namespace = process.env.FIREBASE_PROJECT_ID ?? "demo-redux-cart";
		if (!/^demo-[a-z0-9-]+$/.test(namespace)) {
			throw new Error("Firebase emulator project ID must start with demo-.");
		}

		return {
			databaseURL,
			mode: "emulator",
			namespace,
		};
	}

	const databaseURL = process.env.FIREBASE_DATABASE_URL;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

	if (!databaseURL || !clientEmail || !privateKey) {
		throw new Error("Firebase service-account environment variables are incomplete.");
	}

	const parsedDatabaseURL = new URL(databaseURL);
	const isLocalhost = ["127.0.0.1", "localhost"].includes(
		parsedDatabaseURL.hostname
	);
	if (parsedDatabaseURL.protocol !== "https:" && !isLocalhost) {
		throw new Error("Firebase database URL must use HTTPS.");
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
	const assertion = `${unsignedToken}.${signature}`;
	const response = await fetch("https://oauth2.googleapis.com/token", {
		body: new URLSearchParams({
			assertion,
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		}),
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		method: "POST",
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
	sessionId: string,
	init: RequestInit = {}
): Promise<Response> {
	const environment = readFirebaseEnvironment();
	const url = new URL(
		`carts/${encodeURIComponent(sessionId)}.json`,
		`${environment.databaseURL.toString().replace(/\/$/, "")}/`
	);
	if (environment.mode === "emulator") {
		url.searchParams.set("ns", environment.namespace);
	}
	const token =
		environment.mode === "emulator" ? "owner" : await getAccessToken();

	return fetch(url, {
		...init,
		headers: {
			...init.headers,
			Authorization: `Bearer ${token}`,
		},
	});
}

export async function readCart(sessionId: string): Promise<unknown> {
	const response = await firebaseRequest(sessionId, {
		cache: "no-store",
		headers: { "X-Firebase-ETag": "true" },
	});

	if (!response.ok) throw new Error("Unable to read Firebase cart.");
	return response.json();
}

export async function writeCartIfNewer(
	sessionId: string,
	cart: PersistedCart
): Promise<ConditionalWriteResult> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const currentResponse = await firebaseRequest(sessionId, {
			cache: "no-store",
			headers: { "X-Firebase-ETag": "true" },
		});
		if (!currentResponse.ok) throw new Error("Unable to read Firebase cart.");

		const etag = currentResponse.headers.get("etag");
		if (!etag) throw new Error("Firebase did not provide an ETag.");
		const current: unknown = await currentResponse.json();
		const currentRevision =
			typeof current === "object" &&
			current !== null &&
			"revision" in current &&
			typeof current.revision === "number"
				? current.revision
				: -1;

		if (currentRevision >= cart.revision) {
			return { committed: false, current };
		}

		const writeResponse = await firebaseRequest(sessionId, {
			body: JSON.stringify(cart),
			headers: {
				"Content-Type": "application/json",
				"If-Match": etag,
			},
			method: "PUT",
		});
		if (writeResponse.status === 412) continue;
		if (!writeResponse.ok) throw new Error("Unable to write Firebase cart.");

		return { committed: true, current: cart };
	}

	throw new Error("Firebase cart remained contested after several retries.");
}
