"use client";

import { useEffect } from "react";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}): React.ReactElement {
	useEffect(() => console.error(error), [error]);

	return (
		<main className="page-status" role="alert">
			<h1>Something went wrong</h1>
			<p>Please try again.</p>
			<button onClick={reset} type="button">
				Try again
			</button>
		</main>
	);
}
