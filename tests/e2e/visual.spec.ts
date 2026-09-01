import { expect, test } from "@playwright/test";

test("protects the responsive storefront layout", async ({ page }, testInfo) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { name: /favorite book/i })).toBeVisible();

	const layout = await page.evaluate(() => {
		const header = document.querySelector("header");
		const catalog = document.querySelector("#catalog");
		const controls = document.querySelector('[aria-label="Catalog controls"]');
		const cards = [...document.querySelectorAll('[aria-label="Books"] > li')];
		if (!header || !catalog || !controls || cards.length !== 6) {
			throw new Error("Critical storefront regions are missing.");
		}

		const toBox = (element: Element) => {
			const box = element.getBoundingClientRect();
			return {
				bottom: Math.round(box.bottom),
				height: Math.round(box.height),
				left: Math.round(box.left),
				right: Math.round(box.right),
				top: Math.round(box.top),
				width: Math.round(box.width),
			};
		};

		return {
			cards: cards.map(toBox),
			catalog: toBox(catalog),
			controls: toBox(controls),
			documentWidth: document.documentElement.scrollWidth,
			header: toBox(header),
			viewportWidth: window.innerWidth,
		};
	});

	expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
	expect(layout.catalog.left).toBeGreaterThanOrEqual(0);
	expect(layout.catalog.right).toBeLessThanOrEqual(layout.viewportWidth);
	expect(layout.controls.width).toBeGreaterThan(0);
	expect(layout.cards.every((card) => card.width > 0 && card.height > 0)).toBe(true);

	if (testInfo.project.name === "mobile-chromium") {
		expect(layout.cards[1].top).toBeGreaterThan(layout.cards[0].bottom);
		expect(Math.abs(layout.cards[0].width - layout.cards[1].width)).toBeLessThanOrEqual(1);
	} else {
		expect(Math.abs(layout.cards[0].top - layout.cards[2].top)).toBeLessThanOrEqual(1);
		expect(Math.abs(layout.cards[0].width - layout.cards[2].width)).toBeLessThanOrEqual(1);
	}
});

test("keeps the cart drawer within the viewport", async ({ page }, testInfo) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/");
	const cartButton = page.getByRole("button", { name: /My Cart/i });
	await expect(cartButton).toBeVisible();
	await cartButton.click();
	const dialog = page.getByRole("dialog", { name: "Your Shopping Cart" });
	await expect(dialog).toBeVisible();

	const layout = await dialog.evaluate((element) => {
		const box = element.getBoundingClientRect();
		return {
			dialog: {
				bottom: Math.round(box.bottom),
				height: Math.round(box.height),
				left: Math.round(box.left),
				right: Math.round(box.right),
				top: Math.round(box.top),
				width: Math.round(box.width),
			},
			hasHorizontalOverflow: element.scrollWidth > element.clientWidth,
			viewportHeight: window.innerHeight,
			viewportWidth: window.innerWidth,
		};
	});

	expect(layout.hasHorizontalOverflow).toBe(false);
	expect(layout.dialog.top).toBe(0);
	expect(layout.dialog.bottom).toBe(layout.viewportHeight);
	expect(layout.dialog.right).toBe(layout.viewportWidth);
	if (testInfo.project.name === "mobile-chromium") {
		expect(layout.dialog.width).toBe(layout.viewportWidth);
	} else {
		expect(layout.dialog.width).toBeLessThanOrEqual(544);
		expect(layout.dialog.width).toBeGreaterThanOrEqual(500);
	}
});
