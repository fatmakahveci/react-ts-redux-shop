"use client";

import { LayoutProps } from "@/shared/types";
import { FC } from "react";
import MainHeader from "./MainHeader";

const Layout: FC<LayoutProps> = ({ children }): JSX.Element => {
	return (
		<>
			<MainHeader />
			<main>{children}</main>
		</>
	);
};

export default Layout;
