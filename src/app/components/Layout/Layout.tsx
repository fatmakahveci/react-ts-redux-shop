import type { LayoutProps } from "@/shared/types";
import type { FC } from "react";
import MainHeader from "./MainHeader";

const Layout: FC<LayoutProps> = ({ children }): React.ReactElement => {
	return (
		<>
			<a className="skip-link" href="#main-content">
				Skip to book catalog
			</a>
			<MainHeader />
			<main id="main-content" tabIndex={-1}>
				{children}
			</main>
		</>
	);
};

export default Layout;
