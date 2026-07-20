import {describe, expect, test} from "vitest"
import {create} from "./index"

const en = {tag: "en-US", data: {greeting: "Hello"}}
const zh = {tag: "zh-Hant", data: async () => ({greeting: "你好"})}

describe("create", () => {
	test("exposes current and target locale before and after loading", async () => {
		const match = create([en, zh])
		const result = match(["zh-Hant"])

		expect(result.locale).toEqual({current: "en-US", target: "zh-Hant"})
		expect(result.fallback.greeting).toBe("Hello")
		expect(await result).toEqual({greeting: "你好"})
	})

	test("ignores invalid locale tags", async () => {
		const match = create([en, zh])
		const result = match(["en_US", "zh-hant"])

		expect(result.locale).toEqual({current: "en-US", target: "zh-Hant"})
		expect(await result).toEqual({greeting: "你好"})
	})

	test("supports language-only and script BCP 47 tags", async () => {
		const match = create([
			{tag: "en", data: {greeting: "Hello"}},
			{tag: "zh-Hant", data: {greeting: "你好"}}
		])
		const result = match(["zh-TW"])

		expect(result.locale).toEqual({current: "en", target: "zh-Hant"})
		expect(result.context.locale).toBe("zh-Hant")
		expect(await result).toEqual({greeting: "你好"})
	})
})
