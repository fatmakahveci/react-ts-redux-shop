type ErrorDetails = {
	name: string;
};

function errorDetails(error: unknown): ErrorDetails {
	if (error instanceof Error) {
		// Error messages from SDKs and upstream services can contain URLs,
		// credentials, request bodies, or other sensitive configuration. Keep
		// operational logs useful without serializing attacker-controlled details.
		return { name: error.name };
	}
	return { name: "UnknownError" };
}

export function logServerError(
	event: string,
	error: unknown,
	requestId: string
): void {
	console.error(
		JSON.stringify({
			error: errorDetails(error),
			event,
			level: "error",
			requestId,
			timestamp: new Date().toISOString(),
		})
	);
}
