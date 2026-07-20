import {insert, plural} from "native-i18n"

export default {
	greeting: "你好！",
	farewell: "再見！",
	description: "這是一個使用 Native I18n 的原生 TypeScript 國際化範例。",
	items: {apple: "蘋果", banana: "香蕉", cherry: "櫻桃"},
	welcome: insert("歡迎，{{name}}！", {name: String}),
	itemCount: plural({other: insert("你有 {{value}} 件物品。")})
} satisfies typeof import("./en").default
