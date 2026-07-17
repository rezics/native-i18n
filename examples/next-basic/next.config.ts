import path from "node:path"
import {fileURLToPath} from "node:url"
import type {NextConfig} from "next"

const monorepoRoot = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../.."
)

const nextConfig: NextConfig = {
	transpilePackages: ["native-i18n"],
	outputFileTracingRoot: monorepoRoot
}

export default nextConfig
