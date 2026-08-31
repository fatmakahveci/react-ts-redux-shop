import { makeStore } from "@/app/store";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import Products from "./Products";

function renderProducts() {
	return render(
		<Provider store={makeStore()}>
			<Products />
		</Provider>
	);
}

describe("Products", () => {
	it("searches across titles and authors", () => {
		renderProducts();

		fireEvent.change(screen.getByRole("searchbox", { name: "Search books" }), {
			target: { value: "Nora Aster" },
		});

		expect(screen.getByText("1 book")).toBeVisible();
		expect(
			screen.getByRole("heading", { name: "Atlas of Quiet Stars" })
		).toBeVisible();
		expect(screen.queryByRole("heading", { name: "My First Book" })).toBeNull();
	});

	it("filters by category and sorts by descending price", () => {
		renderProducts();

		fireEvent.change(screen.getByRole("combobox", { name: "Category" }), {
			target: { value: "Travel" },
		});
		fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), {
			target: { value: "price-desc" },
		});

		const products = screen.getAllByRole("listitem");
		expect(products).toHaveLength(2);
		expect(within(products[0]).getByText("Cities of Clay")).toBeVisible();
		expect(within(products[1]).getByText("My Second Book")).toBeVisible();
	});

	it("clears an empty search result", () => {
		renderProducts();

		fireEvent.change(screen.getByRole("searchbox", { name: "Search books" }), {
			target: { value: "not on this shelf" },
		});
		expect(screen.getByRole("heading", { name: "No books found" })).toBeVisible();

		fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
		expect(screen.getByText("6 books")).toBeVisible();
	});
});
