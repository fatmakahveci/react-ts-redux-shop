"use client";

import Cart from "@/app/components/Cart/Cart";
import Layout from "@/app/components/Layout/Layout";
import Products from "@/app/components/Shop/Products";
import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import "./globals.css";

const App = (): JSX.Element => {
	const showCart: boolean = useSelector(
		(state: RootState) => state.ui.cartIsVisible
	);
	return (
		<Layout>
			{showCart && <Cart />}
			<Products />
		</Layout>
	);
};

export default App;
