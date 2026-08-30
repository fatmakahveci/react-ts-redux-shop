"use client";

import { makeStore } from "@/app/store";
import type { ReactNode } from "react";
import { useState } from "react";
import { Provider } from "react-redux";

export default function Providers({
	children,
}: Readonly<{ children: ReactNode }>): React.ReactElement {
	const [store] = useState(makeStore);

	return <Provider store={store}>{children}</Provider>;
}
