import {create} from "native-i18n/react"
import enUS from "./languages/en-US"

export const languages = [
	{tag: "en-US", data: enUS},
	{
		tag: "de-DE",
		data: () => import("./languages/de-DE").then(module => module.default)
	},
	{
		tag: "ja-JP",
		data: () => import("./languages/ja-JP").then(module => module.default)
	}
] as const

export const {useTranslation} = create(languages, {timeZone: "Asia/Shanghai"})
