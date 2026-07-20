import {describe, expect, test, vi} from "vitest"
import {create, currency, defineResources} from "../../src/index"

describe("locale and namespace loading", () => {
	test("loads only the matched locale and requested namespace", async () => {
		const loadGermanCommon = vi.fn(async () => ({price: currency("EUR")}))
		const loadGermanCheckout = vi.fn(async () => ({title: "Kasse"}))
		const loadJapaneseCommon = vi.fn(async () => ({price: currency("EUR")}))
		const i18n = create(
			defineResources({
				fallbackLocale: "en-US",
				loaders: {
					"en-US": {
						common: async () => ({price: currency("EUR")}),
						checkout: async () => ({title: "Checkout"})
					},
					"de-DE": {
						common: loadGermanCommon,
						checkout: loadGermanCheckout
					},
					"ja-JP": {
						common: loadJapaneseCommon,
						checkout: async () => ({title: "購入"})
					}
				}
			})
		)

		const result = await i18n.getTranslation("common", ["de-DE", "ja-JP"])

		expect(result.locale).toEqual({current: "de-DE", target: "de-DE"})
		expect(result.t.price(12)).toBe(
			new Intl.NumberFormat("de-DE", {
				style: "currency",
				currency: "EUR"
			}).format(12)
		)
		expect(loadGermanCommon).toHaveBeenCalledOnce()
		expect(loadGermanCheckout).not.toHaveBeenCalled()
		expect(loadJapaneseCommon).not.toHaveBeenCalled()
	})

	test("supports synchronous and asynchronous namespace loaders", async () => {
		const i18n = create(
			defineResources({
				fallbackLocale: "en",
				loaders: {
					en: {common: () => ({message: "sync"})},
					de: {common: async () => ({message: "async"})}
				}
			})
		)

		expect((await i18n.getTranslation("common", ["en"])).t.message).toBe(
			"sync"
		)
		expect((await i18n.getTranslation("common", ["de"])).t.message).toBe(
			"async"
		)
	})

	test("propagates loader failures and retries rejected resources", async () => {
		const failure = vi
			.fn<() => Promise<{message: string}>>()
			.mockRejectedValueOnce(new Error("load failure"))
			.mockResolvedValue({message: "recovered"})
		const i18n = create(
			defineResources({
				fallbackLocale: "en",
				loaders: {en: {common: failure}}
			})
		)

		await expect(i18n.getTranslation("common", ["en"])).rejects.toThrow(
			"load failure"
		)
		expect((await i18n.getTranslation("common", ["en"])).t.message).toBe(
			"recovered"
		)
		expect(failure).toHaveBeenCalledTimes(2)
	})
})
