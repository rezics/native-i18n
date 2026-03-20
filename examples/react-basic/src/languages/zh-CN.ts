export default {
	greeting: "你好！",
	farewell: "再见！",
	description: "这是一个使用 IntEE 的 React 国际化示例。",
	switchLocale: "切换语言：",
	items: {apple: "苹果", banana: "香蕉", cherry: "樱桃"},
	welcome: (name: string) => `欢迎，${name}！`,
	itemCount: (n: number) => `你有 ${n} 件物品。`
} satisfies typeof import("./en-US").default
