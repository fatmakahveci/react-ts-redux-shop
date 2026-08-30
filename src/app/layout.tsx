import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
	description: "A secure, session-based shopping cart built with Next.js and Redux.",
	title: "ReduxCart",
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
