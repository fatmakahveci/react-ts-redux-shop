"use client";

import { FC } from "react";
import { LayoutProps } from "../../../shared/types";
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
