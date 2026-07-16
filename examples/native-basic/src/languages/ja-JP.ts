import {insert, plural} from "@nmnmcc/intee"

export default {
	greeting: "こんにちは！",
	farewell: "さようなら！",
	description:
		"これは IntEE を使ったネイティブ TypeScript の i18n サンプルです。",
	items: {apple: "りんご", banana: "バナナ", cherry: "さくらんぼ"},
	welcome: insert("ようこそ、{{name}}！", {name: String}),
	itemCount: plural({other: "# 件のアイテムがあります。"})
} satisfies typeof import("./en-US").default
