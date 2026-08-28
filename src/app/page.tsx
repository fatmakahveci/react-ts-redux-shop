"use client";

import { Provider } from "react-redux";
import App from "./_app";
import store from "./store";

const index = (): React.ReactElement => {
	return (
		<Provider store={store}>
			<App />
		</Provider>
	);
};

export default index;
