import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		coverage: {
			exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/shared/types.ts"],
			include: ["src/**/*.{ts,tsx}"],
			reporter: ["text", "html"],
			thresholds: {
				branches: 65,
				functions: 80,
				lines: 80,
				statements: 80,
			},
		},
		environment: "jsdom",
		exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
		setupFiles: ["./src/test/setup.ts"],
	},
});
