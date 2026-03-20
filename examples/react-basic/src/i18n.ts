import {createTranslation} from "@nmnmcc/intee/react"
import enUS from "./languages/en-US"

const en = {tag: "en-US", data: enUS} as const
const zh = {
	tag: "zh-CN",
	data: () => import("./languages/zh-CN").then(m => m.default)
} as const
const ja = {
	tag: "ja-JP",
	data: () => import("./languages/ja-JP").then(m => m.default)
} as const

export const {useTranslation} = createTranslation(en, zh, ja)
