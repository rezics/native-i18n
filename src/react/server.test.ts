import {describe, expect, test} from "vitest"
import {insert} from "../functions"
import {create} from "./server"

const en = {
	tag: "en-US",
	data: {
		greeting: "Hello",
		welcome: insert("Hello, {{name}}", {name: String})
	}
}
const zh = {
	tag: "zh-CN",
	data: async () => ({
		greeting: "你好",
		welcome: insert("你好，{{name}}", {name: String})
	})
}

describe("react/server", () => {
	test("returns a data function and matched tag", async () => {
		const {getTranslation} = create([en, zh])
		const {t, locale} = await getTranslation(["zh-CN"])

		expect(locale).toEqual({current: "zh-CN", target: "zh-CN"})
		expect(t.greeting).toBe("你好")
		expect(t.welcome({name: "Ada"})).toBe("你好，Ada")
	})
})
