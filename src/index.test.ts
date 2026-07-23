import {describe, expect, test, vi} from "vitest"
import {create, defineResources} from "./index"

const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {
			common: () => ({greeting: "Hello"}),
			checkout: () => ({title: "Checkout"})
		},
		"zh-Hant": {
			common: async () => ({greeting: "你好"}),
			checkout: async () => ({title: "結帳"})
		}
	}
})

describe("create", () => {
	test("defines reusable namespace bundles without widening literals", () => {
		const core = create(resources)
		const selection = core.defineTranslationBundle(["common", "checkout"])

		expect(selection).toEqual(["common", "checkout"])
	})

	test("loads a locale and one namespace", async () => {
		const i18n = create(resources)
		const result = await i18n.getTranslation("common", ["zh-Hant"])

		expect(result.locale).toEqual({current: "zh-Hant", target: "zh-Hant"})
		expect(result.t.greeting).toBe("你好")
		expect(result.snapshot.namespaces).toEqual({common: {greeting: "你好"}})
	})

	test("loads multiple namespaces in parallel and preserves boundaries", async () => {
		const i18n = create(resources)
		const result = await i18n.getTranslation(
			["common", "checkout"],
			["zh-Hant"]
		)

		expect(result.t.common.greeting).toBe("你好")
		expect(result.t.checkout.title).toBe("結帳")
	})

	test("ignores invalid locale tags and best-fits script tags", async () => {
		const i18n = create(resources)

		expect(i18n.matchLocale(["en_US", "zh-hant"])).toBe("zh-Hant")
		expect(i18n.matchLocale(["zh-TW"])).toBe("zh-Hant")
	})

	test("deduplicates locale and namespace loads", async () => {
		const load = vi.fn(async () => ({greeting: "Hello"}))
		const i18n = create(
			defineResources({
				fallbackLocale: "en",
				loaders: {en: {common: load}}
			})
		)

		await Promise.all([
			i18n.getTranslation("common", ["en"]),
			i18n.getTranslation("common", ["en"])
		])

		expect(load).toHaveBeenCalledOnce()
	})

	test("does not retain failed namespace loads", async () => {
		let attempts = 0
		const load = vi.fn(async () => {
			attempts += 1
			if (attempts === 1) throw new Error("temporary failure")
			return {greeting: "Hello"}
		})
		const i18n = create(
			defineResources({
				fallbackLocale: "en",
				loaders: {en: {common: load}}
			})
		)

		await expect(i18n.getTranslation("common", ["en"])).rejects.toThrow(
			"temporary failure"
		)
		await expect(
			i18n.getTranslation("common", ["en"])
		).resolves.toMatchObject({data: {greeting: "Hello"}})
		expect(load).toHaveBeenCalledTimes(2)
	})

	test("requires every locale to expose the same namespaces", () => {
		expect(() =>
			create({
				fallbackLocale: "en",
				loaders: {
					en: {common: () => ({greeting: "Hello"})},
					de: {checkout: () => ({title: "Kasse"})}
				}
			} as never)
		).toThrow(/exactly these namespaces/)
	})
})
