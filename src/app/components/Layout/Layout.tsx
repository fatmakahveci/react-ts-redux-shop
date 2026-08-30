import type { LayoutProps } from "@/shared/types";
import type { FC } from "react";
import MainHeader from "./MainHeader";

const Layout: FC<LayoutProps> = ({ children }): React.ReactElement => {
	return (
		<>
			<MainHeader />
			<main>{children}</main>
		</>
	);
};

export default Layout;
