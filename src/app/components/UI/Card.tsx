"use client";

import { FC } from "react";
import { CardProps } from "../../../shared/types";
import "./Card.css";

const Card: FC<CardProps> = ({ className, children }): JSX.Element => {
	return <div className={"card " + className}>{children}</div>;
};

export default Card;
