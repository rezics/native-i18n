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
const nextAssets = await Promise.all(
	nextStaticFiles.map(async path => ({
		path,
		source: await readFile(path, "utf8")
	}))
)
const translationMessages = [
	"Hello from Server Components!",
	"來自 Server Components 的你好！",
	"Server Components からこんにちは！",
	"Switch locale:",
	"切換語言：",
	"言語を切り替え：",
	"The Client Component loaded its unseeded widget namespace.",
	"Client Component 已載入未預先 seed 的 widget namespace。",
	"Client Component が事前に seed されていない widget namespace を読み込みました。"
]
const translationChunks = new Set()

for (const message of translationMessages) {
	const containing = nextAssets.filter(asset =>
		asset.source.includes(message)
	)
	assert(
		containing.length === 1,
		`Expected exactly one Next chunk containing ${JSON.stringify(message)}; found ${containing.length}.`
	)
	const [{path}] = containing
	assert(
		/[\\/]\d+\.[a-f0-9]+\.js$/.test(path),
		`Next translation ${JSON.stringify(message)} should be emitted in an async chunk; found ${path}.`
	)
	translationChunks.add(path)
}

assert(
	translationChunks.size >= 9,
	`Next should emit at least 9 locale × namespace translation chunks; found ${translationChunks.size}.`
)

console.log(
	"Verified locale × namespace chunks and lazy Next translation boundaries."
)
