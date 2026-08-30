import type { CardProps } from "@/shared/types";
import type { FC } from "react";
import styles from "./Card.module.css";

const Card: FC<CardProps> = ({ className, children }): React.ReactElement => {
	return <div className={`${styles.card} ${className ?? ""}`}>{children}</div>;
};

export default Card;
