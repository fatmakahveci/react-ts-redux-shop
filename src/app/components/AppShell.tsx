"use client";

import Cart from "@/app/components/Cart/Cart";
import Layout from "@/app/components/Layout/Layout";
import Products from "@/app/components/Shop/Products";
import Notification from "@/app/components/UI/Notification";
import { fetchCartData } from "@/app/store/cart-actions";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { uiActions } from "@/app/store/ui-slice";
import { useEffect, useRef } from "react";

export default function AppShell(): React.ReactElement {
	const dispatch = useAppDispatch();
	const fetchStarted = useRef(false);
	const { hydrated } = useAppSelector((state) => state.cart);
	const { cartIsVisible, notification } = useAppSelector(
		(state) => state.ui
	);

	useEffect(() => {
		if (fetchStarted.current) return;
		fetchStarted.current = true;
		dispatch(fetchCartData());
	}, [dispatch]);

	useEffect(() => {
		if (!notification || notification.status === "pending") return;
		const timeoutId = window.setTimeout(
			() => dispatch(uiActions.hideNotification()),
			4_000
		);
		return () => window.clearTimeout(timeoutId);
	}, [dispatch, notification]);

	return (
		<>
			{notification && <Notification {...notification} />}
			<Layout>
				{!hydrated ? (
					<p aria-live="polite" className="page-status">
						Loading your cart…
					</p>
				) : (
					<>
						{cartIsVisible && <Cart />}
						<Products />
					</>
				)}
			</Layout>
		</>
	);
}
