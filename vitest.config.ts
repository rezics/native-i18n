import {defineConfig} from "vitest/config"

export default defineConfig({
	test: {
		include: [
			"src/**/*.test.ts",
			"packages/**/*.test.ts",
			"tests/**/*.test.ts"
		],
		environment: "node"
	}
})
