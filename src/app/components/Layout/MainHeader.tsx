import CartButton from "@/app/components/Cart/CartButton";
import styles from "./MainHeader.module.css";

const MainHeader = (): React.ReactElement => {
	return (
		<header className={styles.header}>
			<h1>ReduxCart</h1>
			<nav aria-label="Shopping cart">
				<ul>
					<li>
						<CartButton />
					</li>
				</ul>
			</nav>
		</header>
	);
};

export default MainHeader;
