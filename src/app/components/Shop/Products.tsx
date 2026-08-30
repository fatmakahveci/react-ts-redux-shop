import ProductItem from "@/app/components/Shop/ProductItem";
import { DUMMY_PRODUCTS } from "@/shared/constants";
import type { Product } from "@/shared/types";
import styles from "./Products.module.css";

const Products = (): React.ReactElement => {
	
	return (
		<section className={styles.products}>
			<h2>Buy your favorite products</h2>
			<ul>
				{DUMMY_PRODUCTS.map((product: Product) => (
					<ProductItem
						key={product.id}
						id={product.id}
						title={product.title}
						price={product.price}
						description={product.description}
					/>
				))}
			</ul>
		</section>
	);
};

export default Products;
