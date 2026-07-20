import {insert, plural} from "native-i18n"

export default {
	greeting: "Server Components からこんにちは！",
	description: "このページは Native I18n の Next.js ヘルパーを使っています。",
	welcome: insert("ようこそ、{{name}}！", {name: String}),
	itemCount: plural({other: insert("{{value}} 件のアイテムがあります。")})
} satisfies typeof import("../en-US/home").default
