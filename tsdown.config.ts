import {defineConfig} from "tsdown"

export default defineConfig([
	{
		entry: {
			"index": "src/index.ts",
			"ast": "src/ast.ts",
			"react/index": "src/react/index.ts",
			"react/client": "src/react/public-client.ts",
			"react/seeded": "src/react/seeded.ts",
			"react/server": "src/react/server.ts",
			"next/index": "src/next/index.ts",
			"next/server": "src/next/server.ts",
			"next/client": "src/next/client.ts",
			"next/seeded": "src/next/seeded.ts"
		},
		outDir: "dist",
		format: ["esm", "cjs"],
		dts: true,
		clean: true,
		hash: false,
		external: ["react", "next/headers", "next/navigation"]
	}
])
