export default {
	greeting: "こんにちは！",
	farewell: "さようなら！",
	description:
		"これは IntEE を使ったネイティブ TypeScript の i18n サンプルです。",
	items: {apple: "りんご", banana: "バナナ", cherry: "さくらんぼ"},
	welcome: (name: string) => `ようこそ、${name}！`,
	itemCount: (n: number) => `${n} 件のアイテムがあります。`
} satisfies typeof import("./en-US").default
