import {defineConfig} from "tsdown"

export default defineConfig([
	{
		entry: {"index": "src/index.ts"},
		outDir: "dist",
		format: ["esm", "cjs"],
		dts: true,
		clean: true,
	},
	{
		entry: {"react/index": "src/react/index.ts"},
		outDir: "dist",
		format: ["esm", "cjs"],
		dts: true,
		external: ["react"],
	},
])
