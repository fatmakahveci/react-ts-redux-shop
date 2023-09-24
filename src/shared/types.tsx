"use client";

import { ReactNode } from "react";

export type CardProps = {
    className: string;
    children: ReactNode;
};

export type CartItem = {
	price: number;
	quantity: number;
	title: string;
	total: number;
};

export type LayoutProps = {
	children: ReactNode;
};

export type ProductItem = {
	description: string;
	price: number;
	title: string;
};
