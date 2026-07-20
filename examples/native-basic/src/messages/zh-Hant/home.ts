import {insert, plural} from "native-i18n"

export default {
	description: "這個範例會按語言及 namespace 載入翻譯。",
	welcome: insert("歡迎，{{name}}！", {name: String}),
	itemCount: plural({other: insert("你有 {{value}} 件物品。")})
} satisfies typeof import("../en/home").default
