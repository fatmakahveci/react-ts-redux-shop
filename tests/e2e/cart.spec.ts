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
	await page.getByRole("button", { name: "Add My First Book to cart" }).click();
	await expectSuccessfulMutation(await addResponse);
	const cartButton = page.getByRole("button", { name: /My Cart/i });
	await expect(cartButton).toContainText("1");
	await expect(page.getByRole("status")).toContainText(
		"Your cart is saved and up to date."
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
	const completedCheckout = await checkoutResponse;
	await expectSuccessfulMutation(completedCheckout);
	await expect(
		page.getByRole("heading", { name: "Thank you for your order" })
	).toBeVisible();
	await expect(cartButton).toContainText("0");
	const checkoutMutationId = completedCheckout.request().headers()["idempotency-key"];
	expect(checkoutMutationId).toBeTruthy();
	const repeatedCheckout = await page.evaluate(async (mutationId) => {
		const before = await fetch("/api/cart", { cache: "no-store" }).then((response) =>
			response.json()
		);
		const response = await fetch("/api/cart", {
			headers: { "Idempotency-Key": mutationId },
			method: "DELETE",
		});
		return { before, body: await response.json(), status: response.status };
	}, checkoutMutationId);
	expect(repeatedCheckout.status).toBe(200);
	expect(repeatedCheckout.body.cart).toEqual(repeatedCheckout.before.cart);
	await page.getByRole("button", { name: "Continue browsing" }).click();
	const persistedCartResponse = page.waitForResponse(
		(response) =>
			response.url().endsWith("/api/cart") &&
			response.request().method() === "GET"
	);
	await page.reload();
	const persistedCart = await persistedCartResponse;
	expect(persistedCart.status()).toBe(200);
	expect(await persistedCart.json()).toMatchObject({ cart: { items: [] } });
	await expect(cartButton).toContainText("0");
});

test("preserves concurrent mutations from two tabs", async ({ context, page }) => {
	const secondPage = await context.newPage();
	const mutationBodies: Array<Record<string, unknown>> = [];
	context.on("request", (request) => {
		if (
			request.url().endsWith("/api/cart") &&
			request.method() === "PATCH" &&
			request.postDataJSON()
		) {
			mutationBodies.push(request.postDataJSON() as Record<string, unknown>);
		}
	});
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
	await Promise.all([
		firstBook.getByRole("button", { name: "Add My First Book to cart" }).click(),
		secondBook.getByRole("button", { name: "Add My Second Book to cart" }).click(),
	]);
	await expect.poll(() => mutationBodies.length).toBe(2);
	expect(new Set(mutationBodies.map((body) => body.mutationId)).size).toBe(2);
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const response = await fetch("/api/cart", { cache: "no-store" });
				const body = await response.json();
				return body.cart?.items?.map((item: { id: string }) => item.id).sort();
			})
		)
		.toEqual(["p1", "p2"]);

	await page.reload();
	await page.getByRole("button", { name: /My Cart/i }).click();
	const cart = page.getByLabel("Your Shopping Cart");
	await expect(cart.getByRole("heading", { name: "My First Book" })).toBeVisible();
	await expect(cart.getByRole("heading", { name: "My Second Book" })).toBeVisible();
});

test("retries an offline mutation exactly once when connectivity returns", async ({
	context,
	page,
}) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { name: /favorite book/i })).toBeVisible();
	await context.setOffline(true);

	await page.getByRole("button", { name: "Add My First Book to cart" }).click();
	await expect(page.getByRole("button", { name: /My Cart/i })).toContainText("1");
	await expect(page.getByRole("status")).toContainText("Waiting to sync");
	const queuedMutation = await page.evaluate(() => {
		const raw = localStorage.getItem("quiet-shelf.pending-cart-mutations.v2");
		if (!raw) throw new Error("Offline mutation was not persisted.");
		return JSON.parse(raw)[0] as {
			delta: 1;
			mutationId: string;
			productId: string;
		};
	});
	expect(queuedMutation.mutationId).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
	);

	const retryResponse = waitForCartMutation(page);
	await context.setOffline(false);
	await page.evaluate(() => window.dispatchEvent(new Event("online")));
	await expectSuccessfulMutation(await retryResponse);
	await expect(page.getByRole("status")).toContainText("Cart synced");
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("quiet-shelf.pending-cart-mutations.v2")
			)
		)
		.toBeNull();

	const duplicateResult = await page.evaluate(async (mutation) => {
		const before = await fetch("/api/cart", { cache: "no-store" }).then((response) =>
			response.json()
		);
		const duplicateResponse = await fetch("/api/cart", {
			body: JSON.stringify(mutation),
			headers: { "Content-Type": "application/json" },
			method: "PATCH",
		});
		const duplicate = await duplicateResponse.json();
		return { before, duplicate, status: duplicateResponse.status };
	}, {
		delta: queuedMutation.delta,
		mutationId: queuedMutation.mutationId,
		productId: queuedMutation.productId,
	});
	expect(duplicateResult.status).toBe(200);
	expect(duplicateResult.duplicate.cart).toEqual(duplicateResult.before.cart);

	await page.reload();
	await expect(page.getByRole("button", { name: /My Cart/i })).toContainText("1");
});

test("coordinates offline mutations from two tabs without losing either", async ({
	context,
	page,
}) => {
	const secondPage = await context.newPage();
	await Promise.all([page.goto("/"), secondPage.goto("/")]);
	await Promise.all([
		expect(page.getByRole("heading", { name: /favorite book/i })).toBeVisible(),
		expect(
			secondPage.getByRole("heading", { name: /favorite book/i })
		).toBeVisible(),
	]);
	await context.setOffline(true);

	const firstBook = page
		.getByRole("listitem")
		.filter({ hasText: "My First Book" });
	const secondBook = secondPage
		.getByRole("listitem")
		.filter({ hasText: "My Second Book" });
	await Promise.all([
		firstBook.getByRole("button", { name: "Add My First Book to cart" }).click(),
		secondBook.getByRole("button", { name: "Add My Second Book to cart" }).click(),
	]);
	await expect
		.poll(() =>
			page.evaluate(() => {
				const raw = localStorage.getItem(
					"quiet-shelf.pending-cart-mutations.v2"
				);
				return raw ? JSON.parse(raw) : [];
			})
		)
		.toMatchObject([
			{ attempted: false, productId: expect.any(String) },
			{ attempted: false, productId: expect.any(String) },
		]);

	await context.setOffline(false);
	await Promise.all([
		page.evaluate(() => window.dispatchEvent(new Event("online"))),
		secondPage.evaluate(() => window.dispatchEvent(new Event("online"))),
	]);
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const response = await fetch("/api/cart", { cache: "no-store" });
				const body = await response.json();
				return body.cart?.items?.map((item: { id: string }) => item.id).sort();
			})
		)
		.toEqual(["p1", "p2"]);
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("quiet-shelf.pending-cart-mutations.v2")
			)
		)
		.toBeNull();
});

test("has no automatically detectable accessibility violations", async ({ page }) => {
	await page.route("**/api/cart", async (route) => {
		const request = route.request();
		const cart =
			request.method() === "PATCH"
				? {
						items: [
							{
								description: "A thoughtful first read.",
								id: "p1",
								price: 6,
								quantity: 1,
								title: "My First Book",
							},
						],
						revision: 1,
					}
				: { items: [], revision: 0 };
		await route.fulfill({ contentType: "application/json", json: { cart } });
	});
	const response = await page.goto("/");
	await expect(page.getByRole("heading", { name: /favorite book/i })).toBeVisible();
	await page.keyboard.press("Tab");
	const skipLink = page.getByRole("link", { name: "Skip to book catalog" });
	await expect(skipLink).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page.locator("#main-content")).toBeFocused();

	const accessibilityScan = await new AxeBuilder({ page }).analyze();
	expect(accessibilityScan.violations).toEqual([]);

	const addResponse = waitForCartMutation(page);
	await page.getByRole("button", { name: "Add My First Book to cart" }).click();
	await expectSuccessfulMutation(await addResponse);
	await page.getByRole("button", { name: /My Cart/i }).click();
	await expect(
		page.getByRole("dialog", { name: "Your Shopping Cart" })
	).toBeVisible();
	const drawerScan = await new AxeBuilder({ page })
		.include('[role="dialog"]')
		.analyze();
	expect(drawerScan.violations).toEqual([]);
	await page.getByRole("button", { name: "Checkout securely" }).click();
	await expect(page.getByRole("heading", { name: "Delivery details" })).toBeFocused();
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
