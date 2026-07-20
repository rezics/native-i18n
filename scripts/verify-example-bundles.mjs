import {readdir, readFile} from "node:fs/promises"
import {join} from "node:path"
import {fileURLToPath} from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))

const filesUnder = async directory => {
	const entries = await readdir(directory, {withFileTypes: true})
	const nested = await Promise.all(
		entries.map(entry => {
			const path = join(directory, entry.name)
			return entry.isDirectory() ? filesUnder(path) : [path]
		})
	)
	return nested.flat()
}

const assert = (condition, message) => {
	if (!condition) throw new Error(message)
}

const assertAsyncChunks = async (example, expected) => {
	const assets = await filesUnder(
		join(root, "examples", example, "dist", "assets")
	)
	const names = assets
		.filter(path => path.endsWith(".js"))
		.map(path => path.split("/").at(-1))
	for (const [prefix, count] of Object.entries(expected)) {
		const actual = names.filter(name =>
			name.startsWith(`${prefix}-`)
		).length
		assert(
			actual >= count,
			`${example} should emit at least ${count} ${prefix} async chunks; found ${actual}.`
		)
	}
}

await assertAsyncChunks("native-basic", {common: 2, home: 2})
await assertAsyncChunks("react-basic", {common: 3, home: 3})
await assertAsyncChunks("kitchen-sink", {"en-US": 1, "de-DE": 1, "ja-JP": 1})

const nextStaticFiles = (
	await filesUnder(join(root, "examples", "next-basic", ".next", "static"))
).filter(path => path.endsWith(".js"))
const nextStatic = (
	await Promise.all(nextStaticFiles.map(path => readFile(path, "utf8")))
).join("\n")
const serverOnlyMessages = [
	"Hello from Server Components!",
	"來自 Server Components 的你好！",
	"Server Components からこんにちは！",
	"Switch locale:",
	"切換語言：",
	"言語を切り替え："
]
const serverOnlyRuntime = [
	"Fallback locale",
	"Native I18n resource",
	"Resource loader"
]

for (const message of [...serverOnlyMessages, ...serverOnlyRuntime])
	assert(
		!nextStatic.includes(message),
		`Next client chunks unexpectedly contain server-only content ${JSON.stringify(message)}.`
	)

console.log(
	"Verified locale × namespace chunks and the Next server/client boundary."
)
