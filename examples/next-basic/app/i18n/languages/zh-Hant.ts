import {insert, plural} from "native-i18n"

export default {
	greeting: "來自 Server Components 的你好！",
	farewell: "找不到這個頁面。",
	description: "這個頁面使用 Native I18n 的 Next.js 輔助函式。",
	switchLocale: "切換語言：",
	welcome: insert("歡迎，{{name}}！", {name: String}),
	itemCount: plural({other: insert("你有 {{value}} 件物品。")})
} satisfies typeof import("./en-US").default
