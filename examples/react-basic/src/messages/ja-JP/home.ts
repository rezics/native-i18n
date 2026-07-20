import {insert, plural} from "native-i18n"

export default {
	greeting: "こんにちは！",
	description: "これは Native I18n を使った React の i18n サンプルです。",
	welcome: insert("ようこそ、{{name}}！", {name: String}),
	itemCount: plural({other: insert("{{value}} 件のアイテムがあります。")})
} satisfies typeof import("../en-US/home").default
