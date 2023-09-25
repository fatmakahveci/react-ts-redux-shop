"use client";

import { NotificationProps } from "@/shared/types";
import { FC } from "react";
import "./Notification.css";

const Notification: FC<NotificationProps> = ({
	message,
	status,
	title,
}): JSX.Element => {
	let successErrorClass: string = "";

	if (status === "error") {
		successErrorClass = "error";
	}

	if (status === "success") {
		successErrorClass = "success";
	}

	return (
		<section className={`notification ${successErrorClass}`}>
			<h2>{title}</h2>
			<p>{message}</p>
		</section>
	);
};
export default Notification;
