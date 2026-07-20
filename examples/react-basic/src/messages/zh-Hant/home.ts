import {insert, plural} from "native-i18n"

export default {
	greeting: "你好！",
	description: "這是一個使用 Native I18n 的 React 國際化範例。",
	welcome: insert("歡迎，{{name}}！", {name: String}),
	itemCount: plural({other: insert("你有 {{value}} 件物品。")})
} satisfies typeof import("../en-US/home").default
