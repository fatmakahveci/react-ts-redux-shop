import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Response, test } from "@playwright/test";

function waitForCartMutation(page: Page): Promise<Response> {
	return page.waitForResponse(
		(response) =>
			response.url().endsWith("/api/cart") &&
			response.request().method() === "PATCH"
	);
}

async function expectSuccessfulMutation(response: Response): Promise<void> {
	const responseBody = await response.text();
	expect(response.status(), responseBody).toBe(200);
}

test("adds, opens, increments and removes a cart item", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { name: /favorite book/i })).toBeVisible();

	const addResponse = waitForCartMutation(page);
	await page.getByRole("button", { name: "Add to Cart" }).first().click();
	await expectSuccessfulMutation(await addResponse);
	const cartButton = page.getByRole("button", { name: /My Cart/i });
	await expect(cartButton).toContainText("1");
	await expect(page.getByRole("status")).toContainText(
		"Sent cart data successfully!"
	);

	await page.reload();
	await expect(cartButton).toContainText("1");

	await cartButton.click();
	await expect(page.getByRole("heading", { name: "Your Shopping Cart" })).toBeVisible();
	await page.getByRole("button", { name: /Add one more My First Book/i }).click();
	await expect(cartButton).toContainText("2");

	await page.getByRole("button", { name: /Remove one My First Book/i }).click();
	await expect(cartButton).toContainText("1");
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "Your Shopping Cart" })).toBeHidden();
	await expect(cartButton).toHaveAttribute("aria-expanded", "false");

	await cartButton.click();
	await page.getByRole("button", { name: "Checkout securely" }).click();
	await page.getByRole("textbox", { name: "Full name" }).fill("Ada Reader");
	await page.getByRole("textbox", { name: "Email" }).fill("ada@example.test");
	await page
		.getByRole("textbox", { name: "Street address" })
		.fill("1 Library Lane");
	await page.getByRole("textbox", { name: "City" }).fill("London");
	await page.getByRole("textbox", { name: "Postal code" }).fill("N1 1AA");
	const checkoutScan = await new AxeBuilder({ page })
		.include('[role="dialog"]')
		.analyze();
	expect(checkoutScan.violations).toEqual([]);

	const checkoutResponse = page.waitForResponse(
		(response) =>
			response.url().endsWith("/api/cart") &&
			response.request().method() === "DELETE"
	);
	await page.getByRole("button", { name: /Place order/i }).click();
	await expectSuccessfulMutation(await checkoutResponse);
	await expect(
		page.getByRole("heading", { name: "Thank you for your order" })
	).toBeVisible();
	await expect(cartButton).toContainText("0");
	await page.getByRole("button", { name: "Continue browsing" }).click();
	await page.reload();
	await expect(cartButton).toContainText("0");
});

test("preserves concurrent mutations from two tabs", async ({ context, page }) => {
	const secondPage = await context.newPage();
	await page.goto("/");
	await secondPage.goto("/");
	await Promise.all([
		expect(page.getByRole("heading", { name: /favorite book/i })).toBeVisible(),
		expect(
			secondPage.getByRole("heading", { name: /favorite book/i })
		).toBeVisible(),
	]);

	const firstBook = page
		.getByRole("listitem")
		.filter({ hasText: "My First Book" });
	const secondBook = secondPage
		.getByRole("listitem")
		.filter({ hasText: "My Second Book" });
	const firstResponse = waitForCartMutation(page);
	const secondResponse = waitForCartMutation(secondPage);
	await Promise.all([
		firstBook.getByRole("button", { name: "Add to Cart" }).click(),
		secondBook.getByRole("button", { name: "Add to Cart" }).click(),
	]);
	await Promise.all([
		expectSuccessfulMutation(await firstResponse),
		expectSuccessfulMutation(await secondResponse),
	]);
	await Promise.all([
		expect(page.getByRole("status")).toContainText(
			"Sent cart data successfully!"
		),
		expect(secondPage.getByRole("status")).toContainText(
			"Sent cart data successfully!"
		),
	]);

	await page.reload();
	await page.getByRole("button", { name: /My Cart/i }).click();
	const cart = page.getByLabel("Your Shopping Cart");
	await expect(cart.getByRole("heading", { name: "My First Book" })).toBeVisible();
	await expect(cart.getByRole("heading", { name: "My Second Book" })).toBeVisible();
});

test("has no automatically detectable accessibility violations", async ({ page }) => {
	const response = await page.goto("/");
	await expect(page.getByRole("heading", { name: /favorite book/i })).toBeVisible();

	const accessibilityScan = await new AxeBuilder({ page }).analyze();
	expect(accessibilityScan.violations).toEqual([]);

	await page.getByRole("button", { name: /My Cart/i }).click();
	const drawerScan = await new AxeBuilder({ page })
		.include('[role="dialog"]')
		.analyze();
	expect(drawerScan.violations).toEqual([]);
	const csp = response?.headers()["content-security-policy"];
	expect(csp).toContain("'nonce-");
	expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
});

test("searches, filters and reveals book details", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("searchbox", { name: "Search books" }).fill("stars");
	await expect(page.getByText("1 book", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Atlas of Quiet Stars" })
	).toBeVisible();

	await page.getByText("Book details").click();
	await expect(
		page.getByText(/responsibly sourced paper/i)
	).toBeVisible();

	await page.getByRole("searchbox", { name: "Search books" }).fill("");
	await page.getByRole("button", { name: "Cooking" }).click();
	await expect(page.getByText("1 book", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "A Table for Seasons" })
	).toBeVisible();
});
