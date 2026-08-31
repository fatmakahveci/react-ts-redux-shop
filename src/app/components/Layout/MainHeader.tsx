import CartButton from "@/app/components/Cart/CartButton";
import styles from "./MainHeader.module.css";

const MainHeader = (): React.ReactElement => {
	return (
		<>
			<aside aria-label="Store benefits" className={styles.promo}>
				<span>Free shipping over $35</span>
				<span aria-hidden="true">•</span>
				<span>Independent stories, thoughtfully chosen</span>
			</aside>
			<header className={styles.header}>
				<a className={styles.brand} href="#catalog">
					<h1>ReduxCart</h1>
					<small>Independent books</small>
				</a>
				<nav aria-label="Primary navigation">
					<ul>
						<li className={styles.catalogLink}>
							<a href="#catalog">Browse books</a>
						</li>
						<li>
							<CartButton />
						</li>
					</ul>
				</nav>
			</header>
		</>
	);
};

export default MainHeader;
