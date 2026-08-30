import { expect, test } from "@playwright/test";

test("adds, opens, increments and removes a cart item", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { name: /favorite products/i })).toBeVisible();

	await page.getByRole("button", { name: "Add to Cart" }).first().click();
	const cartButton = page.getByRole("button", { name: /My Cart/i });
	await expect(cartButton).toContainText("1");

	await cartButton.click();
	await expect(page.getByRole("heading", { name: "Your Shopping Cart" })).toBeVisible();
	await page.getByRole("button", { name: /Add one more My First Book/i }).click();
	await expect(cartButton).toContainText("2");

	await page.getByRole("button", { name: /Remove one My First Book/i }).click();
	await expect(cartButton).toContainText("1");
});
