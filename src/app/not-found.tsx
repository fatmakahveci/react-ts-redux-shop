import Link from "next/link";

export default function NotFound(): React.ReactElement {
	return (
		<main className="page-status">
			<h1>Page not found</h1>
			<Link href="/">Return to the shop</Link>
		</main>
	);
}
