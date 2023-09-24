"use client";

import Cart from "./components/Cart/Cart";
import Layout from "./components/Layout/Layout";
import Products from "./components/Shop/Products";
import "./globals.css";

const App = (): JSX.Element => {
	return (
		<>
			<Layout>
				<Cart />
				<Products />
			</Layout>
		</>
	);
};

export default App;
