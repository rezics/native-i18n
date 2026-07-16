import {insert, plural} from "@nmnmcc/intee"

export default {
	greeting: "Server Components からこんにちは！",
	farewell: "このページは見つかりませんでした。",
	description: "このページは IntEE の Next.js ヘルパーを使っています。",
	switchLocale: "言語を切り替え：",
	welcome: insert("ようこそ、{{name}}！", {name: String}),
	itemCount: plural({other: "# 件のアイテムがあります。"})
} satisfies typeof import("./en-US").default
