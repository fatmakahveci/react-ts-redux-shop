import { randomUUID, timingSafeEqual } from "node:crypto";
import { deleteExpiredCarts } from "@/server/firebase-rest";
import { logServerError } from "@/server/logger";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET;
	const authorization = request.headers.get("authorization");
	if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) {
		return false;
	}

	const provided = Buffer.from(authorization.slice("Bearer ".length));
	const expected = Buffer.from(secret);
	return (
		provided.length === expected.length && timingSafeEqual(provided, expected)
	);
}

function json(data: unknown, requestId: string, status = 200): NextResponse {
	return NextResponse.json(data, {
		headers: {
			"Cache-Control": "no-store",
			"X-Request-Id": requestId,
		},
		status,
	});
}

export async function POST(request: Request): Promise<NextResponse> {
	const requestId = randomUUID();
	if (!isAuthorized(request)) {
		return json({ message: "Unauthorized." }, requestId, 401);
	}

	try {
		let deleted = 0;
		for (let batch = 0; batch < 10; batch++) {
			const result = await deleteExpiredCarts();
			deleted += result.deleted;
			if (result.scanned < 100) break;
		}
		return json({ deleted }, requestId);
	} catch (error) {
		logServerError("cart.cleanup.failed", error, requestId);
		return json({ message: "Cart cleanup failed." }, requestId, 503);
	}
}
