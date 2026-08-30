import type { NotificationProps } from "@/shared/types";
import type { FC } from "react";
import styles from "./Notification.module.css";

const Notification: FC<NotificationProps> = ({
	message,
	status,
	title,
}): React.ReactElement => {
	const statusClass = status === "pending" ? "" : styles[status];

	return (
		<section
			aria-live={status === "error" ? "assertive" : "polite"}
			className={`${styles.notification} ${statusClass}`}
			role={status === "error" ? "alert" : "status"}
		>
			<h2>{title}</h2>
			<p>{message}</p>
		</section>
	);
};
export default Notification;
