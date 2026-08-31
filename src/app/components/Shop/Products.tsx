"use client";

import ProductItem from "@/app/components/Shop/ProductItem";
import { DUMMY_PRODUCTS } from "@/shared/constants";
import type { CatalogProduct, ProductCategory } from "@/shared/types";
import { useMemo, useState } from "react";
import styles from "./Products.module.css";

type CategoryFilter = "All" | ProductCategory;
type SortOption = "featured" | "price-asc" | "price-desc" | "title";

const CATEGORIES: CategoryFilter[] = [
	"All",
	"Fiction",
	"Nature",
	"Travel",
	"Cooking",
];

const Products = (): React.ReactElement => {
	const [category, setCategory] = useState<CategoryFilter>("All");
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<SortOption>("featured");

	const visibleProducts = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase("en");
		const filteredProducts = DUMMY_PRODUCTS.filter((product) => {
			const matchesCategory =
				category === "All" || product.category === category;
			const searchableText = `${product.title} ${product.author} ${product.description}`.toLocaleLowerCase(
				"en"
			);
			return matchesCategory && searchableText.includes(normalizedQuery);
		});

		return filteredProducts.toSorted((first, second) => {
			if (sort === "price-asc") return first.price - second.price;
			if (sort === "price-desc") return second.price - first.price;
			if (sort === "title") return first.title.localeCompare(second.title);
			return first.coverIndex - second.coverIndex;
		});
	}, [category, query, sort]);

	return (
		<section className={styles.products} id="catalog">
			<header className={styles.hero}>
				<p className={styles.eyebrow}>Independent stories, thoughtfully chosen</p>
				<h2>Find your next favorite book</h2>
				<p className={styles.lead}>
					A small shelf of beautiful reads for slow mornings, long journeys,
					and curious minds.
				</p>
				<ul aria-label="Store benefits" className={styles.benefits}>
					<li>
						<strong>Curated in small batches</strong>
						<span>Six thoughtful reads, no endless scrolling</span>
					</li>
					<li>
						<strong>Free shipping over $35</strong>
						<span>Build a shelf and we’ll cover delivery</span>
					</li>
					<li>
						<strong>Your cart, safely saved</strong>
						<span>Pick up where you left off</span>
					</li>
				</ul>
			</header>

			<div aria-label="Catalog controls" className={styles.controls}>
				<label className={styles.search}>
					<span>Search books</span>
					<input
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Title, author, or keyword"
						type="search"
						value={query}
					/>
				</label>
				<label>
					<span>Sort by</span>
					<select
						onChange={(event) => setSort(event.target.value as SortOption)}
						value={sort}
					>
						<option value="featured">Featured</option>
						<option value="price-asc">Price: low to high</option>
						<option value="price-desc">Price: high to low</option>
						<option value="title">Title: A–Z</option>
					</select>
				</label>
			</div>
			<div
				aria-label="Filter by category"
				className={styles.categories}
				role="group"
			>
				{CATEGORIES.map((option) => (
					<button
						aria-pressed={category === option}
						key={option}
						onClick={() => setCategory(option)}
						type="button"
					>
						{option === "All" ? "All books" : option}
					</button>
				))}
			</div>

			<p aria-live="polite" className={styles.resultCount}>
				{visibleProducts.length} {visibleProducts.length === 1 ? "book" : "books"}
			</p>

			{visibleProducts.length === 0 ? (
				<div className={styles.emptyState}>
					<h3>No books found</h3>
					<p>Try another keyword or category.</p>
					<button
						onClick={() => {
							setCategory("All");
							setQuery("");
						}}
						type="button"
					>
						Clear filters
					</button>
				</div>
			) : (
				<ul aria-label="Books" className={styles.grid}>
					{visibleProducts.map((product: CatalogProduct) => (
						<ProductItem key={product.id} {...product} />
					))}
				</ul>
			)}
		</section>
	);
};

export default Products;
