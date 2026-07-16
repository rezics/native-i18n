import {insert, plural} from "@nmnmcc/intee"

export default {
	greeting: "こんにちは！",
	farewell: "さようなら！",
	description: "これは IntEE を使った React の i18n サンプルです。",
	switchLocale: "言語を切り替え：",
	items: {apple: "りんご", banana: "バナナ", cherry: "さくらんぼ"},
	welcome: insert("ようこそ、{{name}}！", {name: String}),
	itemCount: plural({other: "# 件のアイテムがあります。"})
} satisfies typeof import("./en-US").default
