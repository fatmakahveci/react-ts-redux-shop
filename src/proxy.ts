import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest): NextResponse {
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
	const isDevelopment = process.env.NODE_ENV === "development";
	const contentSecurityPolicy = `
		default-src 'self';
		base-uri 'self';
		connect-src 'self'${isDevelopment ? " ws:" : ""};
		font-src 'self';
		form-action 'self';
		frame-ancestors 'none';
		img-src 'self' blob: data:;
		object-src 'none';
		script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
			isDevelopment ? " 'unsafe-eval'" : ""
		};
		style-src 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`};
		${isDevelopment ? "" : "upgrade-insecure-requests;"}
	`
		.replace(/\s{2,}/g, " ")
		.trim();

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
	requestHeaders.set("x-nonce", nonce);
	const response = NextResponse.next({ request: { headers: requestHeaders } });
	response.headers.set("Content-Security-Policy", contentSecurityPolicy);
	return response;
}

export const config = {
	matcher: [
		{
			missing: [
				{ key: "next-router-prefetch", type: "header" },
				{ key: "purpose", type: "header", value: "prefetch" },
			],
			source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
		},
	],
};
