import {defineResources} from "native-i18n"
import {create} from "native-i18n/react"

export const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {
			kitchen: () =>
				import("./languages/en-US").then(module => module.default)
		},
		"de-DE": {
			kitchen: () =>
				import("./languages/de-DE").then(module => module.default)
		},
		"ja-JP": {
			kitchen: () =>
				import("./languages/ja-JP").then(module => module.default)
		}
	}
})

export const {useTranslation} = create(resources, {timeZone: "Asia/Shanghai"})
