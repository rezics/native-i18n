import {insert, plural} from "@nmnmcc/intee"

export default {
	greeting: "你好！",
	farewell: "再见！",
	description: "这是一个使用 IntEE 的原生 TypeScript 国际化示例。",
	items: {apple: "苹果", banana: "香蕉", cherry: "樱桃"},
	welcome: insert("欢迎，{{name}}！", {name: String}),
	itemCount: plural({other: "你有 # 件物品。"})
} satisfies typeof import("./en-US").default
