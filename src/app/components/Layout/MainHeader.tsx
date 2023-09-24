"use client";

import CartButton from "../Cart/CartButton";
import "./MainHeader.css";

const MainHeader = (): JSX.Element => {
	return (
		<header className="header">
			<h1>ReduxCart</h1>
			<nav>
				<ul>
					<li>
						<CartButton />
					</li>
				</ul>
			</nav>
		</header>
	);
};

export default MainHeader;
