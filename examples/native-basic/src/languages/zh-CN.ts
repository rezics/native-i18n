import {insert, plural} from "native-i18n"

export default {
	greeting: "你好！",
	farewell: "再见！",
	description: "这是一个使用 Native I18n 的原生 TypeScript 国际化示例。",
	items: {apple: "苹果", banana: "香蕉", cherry: "樱桃"},
	welcome: insert("欢迎，{{name}}！", {name: String}),
	itemCount: plural({other: insert("你有 {{value}} 件物品。")})
} satisfies typeof import("./en-US").default
