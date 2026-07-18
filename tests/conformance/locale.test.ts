import {describe, expect, test, vi} from "vitest"
import {create, currency} from "../../src/index"

describe("locale loading", () => {
	test("loads only the matched language and exposes fallback state immediately", async () => {
		const loadGerman = vi.fn(async () => ({price: currency("EUR")}))
		const loadJapanese = vi.fn(async () => ({price: currency("EUR")}))
		const match = create([
			{tag: "en-US", data: {price: currency("EUR")}},
			{tag: "de-DE", data: loadGerman},
			{tag: "ja-JP", data: loadJapanese}
		])
		const result = match(["de-DE", "ja-JP"])

		expect(result.locale).toEqual({current: "en-US", target: "de-DE"})
		expect(result.context).toEqual({locale: "de-DE", timeZone: "UTC"})
		expect(result.fallback.price(12)).toBe(
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "EUR"
			}).format(12)
		)

		const german = await result
		expect(german.price(12)).toBe(
			new Intl.NumberFormat("de-DE", {
				style: "currency",
				currency: "EUR"
			}).format(12)
		)
		expect(loadGerman).toHaveBeenCalledOnce()
		expect(loadJapanese).not.toHaveBeenCalled()
	})

	test("supports data, synchronous loaders and asynchronous loaders", async () => {
		const match = create([
			{tag: "en", data: {message: "data"}},
			{tag: "fr", data: () => ({message: "sync"})},
			{tag: "de", data: async () => ({message: "async"})}
		])

		expect((await match(["en"])).message).toBe("data")
		expect((await match(["fr"])).message).toBe("sync")
		expect((await match(["de"])).message).toBe("async")
	})

	test("propagates synchronous and asynchronous loader failures", async () => {
		const synchronous = create([
			{tag: "en", data: {message: "fallback"}},
			{
				tag: "fr",
				data: () => {
					throw new Error("sync failure")
				}
			}
		] as const)
		const asynchronous = create([
			{tag: "en", data: {message: "fallback"}},
			{
				tag: "de",
				data: async () => Promise.reject(new Error("async failure"))
			}
		] as const)

		await expect(synchronous(["fr"])).rejects.toThrow("sync failure")
		await expect(asynchronous(["de"])).rejects.toThrow("async failure")
	})
})
