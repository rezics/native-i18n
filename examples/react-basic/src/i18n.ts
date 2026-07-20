import {create} from "native-i18n/react"
import enUS from "./languages/en-US"

const en = {tag: "en-US", data: enUS} as const
const zh = {
	tag: "zh-Hant",
	data: () => import("./languages/zh-Hant").then(m => m.default)
} as const
const ja = {
	tag: "ja-JP",
	data: () => import("./languages/ja-JP").then(m => m.default)
} as const

export const {useTranslation} = create([en, zh, ja])
