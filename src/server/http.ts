export class PayloadTooLargeError extends Error {}

export function isJsonRequest(request: Request): boolean {
	const contentType = request.headers.get("content-type");
	return contentType?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

export function isSameOriginRequest(request: Request): boolean {
	const origin = request.headers.get("origin");
	if (!origin) return true;

	try {
		const requestHost = request.headers.get("host") ?? new URL(request.url).host;
		return new URL(origin).host === requestHost;
	} catch {
		return false;
	}
}

export async function readLimitedJson(
	request: Request,
	maxBytes: number
): Promise<unknown> {
	const contentLength = request.headers.get("content-length");
	if (contentLength) {
		const parsedLength = Number(contentLength);
		if (
			!Number.isSafeInteger(parsedLength) ||
			parsedLength < 0 ||
			parsedLength > maxBytes
		) {
			throw new PayloadTooLargeError("Request body is too large.");
		}
	}

	if (!request.body) return JSON.parse("");
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let receivedBytes = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		receivedBytes += value.byteLength;
		if (receivedBytes > maxBytes) {
			await reader.cancel();
			throw new PayloadTooLargeError("Request body is too large.");
		}
		chunks.push(value);
	}

	const body = new Uint8Array(receivedBytes);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return JSON.parse(new TextDecoder().decode(body));
}
