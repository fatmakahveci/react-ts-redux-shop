import CartButton from "@/app/components/Cart/CartButton";
import styles from "./MainHeader.module.css";

const MainHeader = (): React.ReactElement => {
	return (
		<header className={styles.header}>
			<a className={styles.brand} href="#catalog">
				<h1>ReduxCart</h1>
				<small>Independent books</small>
			</a>
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
