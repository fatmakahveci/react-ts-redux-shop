"use client";

import { ReactNode } from "react";

export type CardProps = {
	className: string;
	children: ReactNode;
};

export type CartItem = {
	id: string;
	price: number;
	quantity: number;
	title: string;
	total: number;
};

export type CartSliceState = {
	items: CartItem[];
	totalQuantity: number;
};

export type LayoutProps = {
	children: ReactNode;
};

export type Product = {
	id: string;
	description?: string;
	price: number;
	title: string;
};

export type UiSliceState = {
	cartIsVisible: boolean;
};
