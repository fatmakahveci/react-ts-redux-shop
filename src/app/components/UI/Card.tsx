"use client";

import { CardProps } from "@/shared/types";
import { FC } from "react";
import "./Card.css";

const Card: FC<CardProps> = ({ className, children }): JSX.Element => {
	return <div className={"card " + className}>{children}</div>;
};

export default Card;
