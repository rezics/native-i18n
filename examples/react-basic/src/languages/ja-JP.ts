export default {
	greeting: "こんにちは！",
	farewell: "さようなら！",
	description: "これは IntEE を使った React の i18n サンプルです。",
	switchLocale: "言語を切り替え：",
	items: {apple: "りんご", banana: "バナナ", cherry: "さくらんぼ"},
	welcome: (name: string) => `ようこそ、${name}！`,
	itemCount: (n: number) => `${n} 件のアイテムがあります。`
} satisfies typeof import("./en-US").default
