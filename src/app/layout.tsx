"use client";

import { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	return (
		<html lang="en">
			<body className="{body}">{children}</body>
		</html>
	);
}
