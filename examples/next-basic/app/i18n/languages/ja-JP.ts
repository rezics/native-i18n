import {insert, plural} from "native-i18n"

export default {
	greeting: "Server Components からこんにちは！",
	farewell: "このページは見つかりませんでした。",
	description: "このページは Native I18n の Next.js ヘルパーを使っています。",
	switchLocale: "言語を切り替え：",
	welcome: insert("ようこそ、{{name}}！", {name: String}),
	itemCount: plural({other: "# 件のアイテムがあります。"})
} satisfies typeof import("./en-US").default
