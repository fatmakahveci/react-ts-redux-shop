import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import Loading from "./loading";
import NotFound from "./not-found";

describe("route status pages", () => {
	afterEach(() => vi.restoreAllMocks());

	it("reports a route error and lets the visitor retry", () => {
		const error = new Error("render failed");
		const reset = vi.fn();
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		render(<ErrorPage error={error} reset={reset} />);

		expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(reset).toHaveBeenCalledOnce();
		expect(consoleError).toHaveBeenCalledWith(error);
	});

	it("announces route loading without interrupting the visitor", () => {
		render(<Loading />);

		expect(screen.getByText("Loading…")).toHaveAttribute("aria-live", "polite");
	});

	it("offers a direct route back from an unknown page", () => {
		render(<NotFound />);

		expect(screen.getByRole("heading", { name: "Page not found" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Return to the shop" })).toHaveAttribute(
			"href",
			"/"
		);
	});
});
