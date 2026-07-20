import {create} from "native-i18n"
import english from "./languages/en"

const en = {tag: "en", data: english} as const
const zh = {
	tag: "zh-Hant",
	data: () => import("./languages/zh-Hant").then(m => m.default)
} as const

const match = create([en, zh])

const output = document.getElementById("output")!
const select = document.getElementById("locale-select") as HTMLSelectElement

async function render(locale: string) {
	output.textContent = "Loading…"

	const result = match([locale])
	const t = await result
	document.documentElement.lang = result.locale.target

	output.innerHTML = `
		<p><strong>${t.greeting}</strong></p>
		<p>${t.description}</p>
		<p>${t.welcome({name: "Alice"})}</p>
		<p>${t.itemCount(3)}</p>
		<p>${t.farewell}</p>
		<p>Items: ${t.items.apple}, ${t.items.banana}, ${t.items.cherry}</p>
		<p style="color: #888; font-size: 0.85rem">Requested tag: ${locale}</p>
		<p style="color: #888; font-size: 0.85rem">Matched tag: ${result.locale.target}</p>
	`
}

render(select.value)
select.addEventListener("change", () => render(select.value))
