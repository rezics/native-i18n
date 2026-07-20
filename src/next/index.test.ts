import {beforeEach, describe, expect, test, vi} from "vitest"
import {cookies, headers} from "next/headers"
import {defineResources} from ".."
import {create} from "./index"

vi.mock("next/headers", () => ({cookies: vi.fn(), headers: vi.fn()}))

const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {common: async () => ({greeting: "Hello"})},
		"zh-Hant": {common: async () => ({greeting: "你好"})},
		"ja-JP": {common: async () => ({greeting: "こんにちは"})}
	}
})

describe("next", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test("prefers locale cookie before accept-language", async () => {
		vi.mocked(cookies).mockResolvedValue({
			get: (name: string) =>
				name === "NEXT_LOCALE" ? {value: "ja-JP"} : undefined
		} as Awaited<ReturnType<typeof cookies>>)
		vi.mocked(headers).mockResolvedValue({
			get: (name: string) =>
				name === "accept-language" ? "zh-Hant;q=0.9,en-US;q=0.8" : null
		} as Awaited<ReturnType<typeof headers>>)

		const {getLocaleTags, getTranslation} = create(resources)

		expect(await getLocaleTags()).toEqual(["ja-JP", "zh-Hant", "en-US"])
		const {t, locale} = await getTranslation("common")
		expect(locale).toEqual({current: "ja-JP", target: "ja-JP"})
		expect(t.greeting).toBe("こんにちは")
	})

	test("can disable cookie lookup", async () => {
		vi.mocked(headers).mockResolvedValue({
			get: (name: string) =>
				name === "accept-language" ? "zh-Hant,en-US;q=0.8" : null
		} as Awaited<ReturnType<typeof headers>>)

		const {getLocaleTags} = create(resources, {cookieName: false})

		expect(await getLocaleTags()).toEqual(["zh-Hant", "en-US"])
		expect(cookies).not.toHaveBeenCalled()
	})

	test("ignores an invalid locale cookie", async () => {
		vi.mocked(cookies).mockResolvedValue({
			get: (name: string) =>
				name === "NEXT_LOCALE" ? {value: "en_US"} : undefined
		} as Awaited<ReturnType<typeof cookies>>)
		vi.mocked(headers).mockResolvedValue({
			get: (name: string) =>
				name === "accept-language" ? "zh-Hant,en-US;q=0.8" : null
		} as Awaited<ReturnType<typeof headers>>)

		const {getTranslation} = create(resources)

		expect((await getTranslation("common")).locale).toEqual({
			current: "zh-Hant",
			target: "zh-Hant"
		})
	})
})
