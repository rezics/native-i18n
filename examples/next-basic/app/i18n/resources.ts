import {defineResources} from "native-i18n"

export const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {
			common: () =>
				import("./messages/en-US/common").then(
					module => module.default
				),
			home: () =>
				import("./messages/en-US/home").then(module => module.default),
			widget: () =>
				import("./messages/en-US/widget").then(module => module.default)
		},
		"zh-Hant": {
			common: () =>
				import("./messages/zh-Hant/common").then(
					module => module.default
				),
			home: () =>
				import("./messages/zh-Hant/home").then(
					module => module.default
				),
			widget: () =>
				import("./messages/zh-Hant/widget").then(
					module => module.default
				)
		},
		"ja-JP": {
			common: () =>
				import("./messages/ja-JP/common").then(
					module => module.default
				),
			home: () =>
				import("./messages/ja-JP/home").then(module => module.default),
			widget: () =>
				import("./messages/ja-JP/widget").then(module => module.default)
		}
	}
})
