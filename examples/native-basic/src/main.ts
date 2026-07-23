import {create, defineResources} from "native-i18n"

const resources = defineResources({
	fallbackLocale: "en",
	loaders: {
		"en": {
			common: () =>
				import("./messages/en/common").then(module => module.default),
			home: () =>
				import("./messages/en/home").then(module => module.default)
		},
		"zh-Hant": {
			common: () =>
				import("./messages/zh-Hant/common").then(
					module => module.default
				),
			home: () =>
				import("./messages/zh-Hant/home").then(module => module.default)
		}
	}
})

const i18n = create(resources)
const output = document.getElementById("output")!
const select = document.getElementById("locale-select") as HTMLSelectElement

async function render(locale: string) {
	output.textContent = "Loading…"

	const {t, locale: resolved} = await i18n.getTranslation(
		["common", "home"],
		[locale]
	)
	document.documentElement.lang = resolved.current

	output.innerHTML = `
		<p><strong>${t.common.greeting}</strong></p>
		<p>${t.home.description}</p>
		<p>${t.home.welcome({name: "Alice"})}</p>
		<p>${t.home.itemCount(3)}</p>
		<p>${t.common.farewell}</p>
		<p>Items: ${t.common.items.apple}, ${t.common.items.banana}, ${t.common.items.cherry}</p>
		<p style="color: #888; font-size: 0.85rem">Requested tag: ${locale}</p>
		<p style="color: #888; font-size: 0.85rem">Matched tag: ${resolved.current}</p>
	`
}

void render(select.value)
select.addEventListener("change", () => void render(select.value))
