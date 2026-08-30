import type { NextConfig } from "next";

const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), geolocation=(), microphone=()",
	},
	...(process.env.NODE_ENV === "production"
		? [
				{
					key: "Content-Security-Policy",
					value:
						"default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
				},
				{
					key: "Strict-Transport-Security",
					value: "max-age=31536000; includeSubDomains",
				},
			]
		: []),
];

const nextConfig: NextConfig = {
	agentRules: false,
	poweredByHeader: false,
	async headers() {
		return [{ source: "/(.*)", headers: securityHeaders }];
	},
};

export default nextConfig;
