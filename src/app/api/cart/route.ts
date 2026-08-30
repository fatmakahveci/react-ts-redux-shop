import { validatePersistedCart } from "@/shared/cart-schema";
import type { PersistedCart } from "@/shared/types";
import { readCart, writeCartIfNewer } from "@/server/firebase-rest";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ValidationError } from "yup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CART_SESSION_COOKIE = "cart_session";
const EMPTY_CART: PersistedCart = { items: [], revision: 0 };
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getCartSessionId(): Promise<string> {
	const cookieStore = await cookies();
	const existingSessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;

	if (existingSessionId && UUID_PATTERN.test(existingSessionId)) {
		return existingSessionId;
	}

	const sessionId = randomUUID();
	cookieStore.set(CART_SESSION_COOKIE, sessionId, {
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 30,
		path: "/",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});

	return sessionId;
}

function json(data: unknown, status = 200): NextResponse {
	return NextResponse.json(data, {
		status,
		headers: { "Cache-Control": "no-store" },
	});
}

export async function GET(): Promise<NextResponse> {
	try {
		const sessionId = await getCartSessionId();
		const rawCart = await readCart(sessionId);
		const cart = rawCart
			? await validatePersistedCart(rawCart)
			: EMPTY_CART;

		return json({ cart });
	} catch (error) {
		console.error("Unable to read cart", error);
		return json({ message: "Cart service is unavailable." }, 503);
	}
}

export async function PUT(request: Request): Promise<NextResponse> {
	try {
		const origin = request.headers.get("origin");
		const host = request.headers.get("host");
		if (origin && (!host || new URL(origin).host !== host)) {
			return json({ message: "Cross-origin request rejected." }, 403);
		}

		const rawBody = await request.text();
		if (new TextEncoder().encode(rawBody).byteLength > 50_000) {
			return json({ message: "Cart payload is too large." }, 413);
		}

		const cart = await validatePersistedCart(JSON.parse(rawBody));
		const sessionId = await getCartSessionId();
		const result = await writeCartIfNewer(sessionId, cart);

		if (!result.committed) {
			const currentCart = result.current
				? await validatePersistedCart(result.current)
				: EMPTY_CART;
			return json(
				{ cart: currentCart, message: "A newer cart already exists." },
				409
			);
		}

		return json({ cart });
	} catch (error) {
		if (error instanceof ValidationError || error instanceof SyntaxError) {
			return json({ message: "Invalid cart payload." }, 400);
		}

		console.error("Unable to save cart", error);
		return json({ message: "Cart service is unavailable." }, 503);
	}
}
