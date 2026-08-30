import Providers from "@/app/providers";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell";

describe("AppShell", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("keeps the storefront usable when persistence is unavailable", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		render(
			<Providers>
				<AppShell />
			</Providers>
		);

		expect(
			await screen.findByRole("heading", { name: /favorite products/i })
		).toBeVisible();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Fetching cart data failed!"
		);
	});
});
