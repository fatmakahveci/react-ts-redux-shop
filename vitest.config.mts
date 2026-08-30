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
			reporter: ["text", "html"],
		},
		environment: "jsdom",
		exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
		setupFiles: ["./src/test/setup.ts"],
	},
});
