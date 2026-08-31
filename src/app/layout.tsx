import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
	description:
		"Discover thoughtfully selected independent books and keep your reading list in a secure, session-based cart.",
	title: "ReduxCart | Independent Books",
};

export default function RootLayout({
	children,
}: Readonly<{ children: ReactNode }>): React.ReactElement {
	return (
		<html lang="en">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
