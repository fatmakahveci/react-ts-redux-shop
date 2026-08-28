"use client";

import { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({
	children,
}: {
	children: ReactNode;
}): React.ReactElement {
	return (
		<html lang="en">
			<body className="{body}">{children}</body>
		</html>
	);
}
