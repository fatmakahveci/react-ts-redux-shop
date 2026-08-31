type ErrorDetails = {
	message: string;
	name: string;
};

function errorDetails(error: unknown): ErrorDetails {
	if (error instanceof Error) {
		return { message: error.message, name: error.name };
	}
	return { message: "Unknown error", name: "UnknownError" };
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
