"use client";

import Layout from "@/app/components/Layout/Layout";
import Products from "@/app/components/Shop/Products";
import Notification from "@/app/components/UI/Notification";
import {
	fetchCartData,
	LEGACY_PENDING_CART_MUTATIONS_KEY,
	PENDING_CART_MUTATIONS_KEY,
	retryPendingCartMutations,
} from "@/app/store/cart-actions";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { uiActions } from "@/app/store/ui-slice";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const CartDrawer = dynamic(() => import("@/app/components/Cart/CartDrawer"), {
	ssr: false,
});

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
		void dispatch(fetchCartData()).then(() =>
			dispatch(retryPendingCartMutations())
		);
	}, [dispatch]);

	useEffect(() => {
		const retry = () => void dispatch(retryPendingCartMutations());
		const retryFromStorage = (event: StorageEvent) => {
			if (
				event.key === PENDING_CART_MUTATIONS_KEY ||
				event.key === LEGACY_PENDING_CART_MUTATIONS_KEY
			) {
				retry();
			}
		};
		window.addEventListener("online", retry);
		window.addEventListener("storage", retryFromStorage);
		return () => {
			window.removeEventListener("online", retry);
			window.removeEventListener("storage", retryFromStorage);
		};
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
						{cartIsVisible && <CartDrawer />}
						<Products />
					</>
				)}
			</Layout>
		</>
	);
}
