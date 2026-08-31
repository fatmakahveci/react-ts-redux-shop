import type { ReactNode } from "react";

export type CardProps = {
	className?: string;
	children: ReactNode;
};

export type CartItem = {
	id: string;
	price: number;
	quantity: number;
	title: string;
};

export type PersistedCart = {
	items: CartItem[];
	revision: number;
};

export type CartMutation = {
	delta: -1 | 1;
	productId: string;
};

export type CartSliceState = PersistedCart & {
	hydrated: boolean;
};

export type LayoutProps = {
	children: ReactNode;
};

export type NotificationProps = {
	message: string;
	status: "error" | "pending" | "success";
	title: string;
};

export type Product = {
	id: string;
	description?: string;
	price: number;
	title: string;
};

export type UiSliceState = {
	cartIsVisible: boolean;
	notification: NotificationProps | null;
};
