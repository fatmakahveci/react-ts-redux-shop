import { randomUUID } from "node:crypto";
import { mutateCart, readCart } from "@/server/firebase-rest";
import {
	isJsonRequest,
	isSameOriginRequest,
	PayloadTooLargeError,
	readLimitedJson,
} from "@/server/http";
import { logServerError } from "@/server/logger";
import { validateCartMutation } from "@/shared/cart-schema";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ValidationError } from "yup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CART_SESSION_COOKIE = "cart_session";
const MAX_MUTATION_BYTES = 2_048;
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

function json(
	data: unknown,
	requestId: string,
	status = 200,
	headers?: HeadersInit
): NextResponse {
	const responseHeaders = new Headers(headers);
	responseHeaders.set("Cache-Control", "no-store");
	responseHeaders.set("X-Request-Id", requestId);
	return NextResponse.json(data, { headers: responseHeaders, status });
}

export async function GET(): Promise<NextResponse> {
	const requestId = randomUUID();
	try {
		const sessionId = await getCartSessionId();
		return json({ cart: await readCart(sessionId) }, requestId);
	} catch (error) {
		logServerError("cart.read.failed", error, requestId);
		return json({ message: "Cart service is unavailable." }, requestId, 503);
	}
}

export async function PATCH(request: Request): Promise<NextResponse> {
	const requestId = randomUUID();
	try {
		if (!isSameOriginRequest(request)) {
			return json(
				{ message: "Cross-origin request rejected." },
				requestId,
				403
			);
		}
		if (!isJsonRequest(request)) {
			return json(
				{ message: "Content-Type must be application/json." },
				requestId,
				415
			);
		}

		const mutation = await validateCartMutation(
			await readLimitedJson(request, MAX_MUTATION_BYTES)
		);
		const sessionId = await getCartSessionId();
		const result = await mutateCart(sessionId, mutation);

		if (result.rateLimited) {
			return json(
				{ cart: result.cart, message: "Too many cart updates." },
				requestId,
				429,
				{ "Retry-After": String(result.retryAfter ?? 60) }
			);
		}

		return json({ cart: result.cart }, requestId);
	} catch (error) {
		if (error instanceof PayloadTooLargeError) {
			return json({ message: "Cart payload is too large." }, requestId, 413);
		}
		if (error instanceof ValidationError || error instanceof SyntaxError) {
			return json({ message: "Invalid cart mutation." }, requestId, 400);
		}

		logServerError("cart.mutation.failed", error, requestId);
		return json({ message: "Cart service is unavailable." }, requestId, 503);
	}
}
