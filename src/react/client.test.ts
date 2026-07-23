import {createElement} from "react"
import {renderToReadableStream, renderToString} from "react-dom/server"
import {describe, expect, test, vi} from "vitest"
import {create as createCore, defineResources} from ".."
import {create} from "./factory"

const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {
			common: async () => ({greeting: "Hello"}),
			checkout: async () => ({title: "Checkout"})
		},
		"zh-Hant": {
			common: async () => ({greeting: "你好"}),
			checkout: async () => ({title: "結帳"})
		}
	}
})

describe("react/client", () => {
	test("reads a server-seeded namespace without runtime resource loaders", async () => {
		const snapshot = (
			await createCore(resources).getTranslation("common", ["zh-Hant"])
		).snapshot
		const {TranslationProvider, useTranslation} = create<typeof resources>()

		const html = renderToString(
			createElement(
				TranslationProvider,
				{initial: snapshot},
				createElement(function Login() {
					const {t, locale} = useTranslation("common")
					return createElement(
						"p",
						null,
						`${locale.current}/${locale.target}:${t.greeting}`
					)
				})
			)
		)

		expect(html).toContain("zh-Hant/zh-Hant:你好")
	})

	test("merges namespaces from nested providers without mixing locales", async () => {
		const core = createCore(resources)
		const [common, checkout] = await Promise.all([
			core.getTranslation("common", ["zh-Hant"]),
			core.getTranslation("checkout", ["zh-Hant"])
		])
		const {TranslationProvider, useTranslation} = create<typeof resources>()
		const html = renderToString(
			createElement(
				TranslationProvider,
				{initial: common.snapshot},
				createElement(
					TranslationProvider,
					{initial: checkout.snapshot},
					createElement(function Checkout() {
						const {t} = useTranslation([
							"common",
							"checkout"
						] as const)
						return createElement(
							"p",
							null,
							`${t.common.greeting}/${t.checkout.title}`
						)
					})
				)
			)
		)

		expect(html).toContain("你好/結帳")
	})

	test("keeps nested namespace overrides scoped to their provider", async () => {
		const common = (
			await createCore(resources).getTranslation("common", ["en-US"])
		).snapshot
		const replacement = {
			...common,
			namespaces: {common: {greeting: "Updated"}}
		} as typeof common
		const {TranslationProvider, useTranslation} = create<typeof resources>()
		const Greeting = () => {
			const {t} = useTranslation("common")
			return createElement("span", null, t.greeting)
		}
		const html = renderToString(
			createElement(
				TranslationProvider,
				{initial: common},
				createElement(Greeting),
				createElement(
					TranslationProvider,
					{initial: replacement},
					createElement(Greeting)
				),
				createElement(Greeting)
			)
		)

		expect(html).toContain("Hello")
		expect(html).toContain("Updated")
		expect(html.match(/Hello/g)).toHaveLength(2)
	})

	test("reports an unseeded namespace without entering Suspense", async () => {
		const common = (
			await createCore(resources).getTranslation("common", ["en-US"])
		).snapshot
		const {TranslationProvider, useTranslation} = create<typeof resources>()

		expect(() =>
			renderToString(
				createElement(
					TranslationProvider,
					{initial: common},
					createElement(function Checkout() {
						useTranslation("checkout")
						return null
					})
				)
			)
		).toThrow(/has not seeded namespace "checkout"/)
	})

	test("suspends only for a missing namespace when client loaders are enabled", async () => {
		const loadCommon = vi.fn(async () => ({greeting: "Hello"}))
		const loadCheckout = vi.fn(async () => ({title: "Checkout"}))
		const lazyResources = defineResources({
			fallbackLocale: "en-US",
			loaders: {"en-US": {common: loadCommon, checkout: loadCheckout}}
		})
		const {useTranslation} = create(lazyResources)
		const stream = await renderToReadableStream(
			createElement(function Greeting() {
				const {t} = useTranslation("common")
				return createElement("p", null, t.greeting)
			})
		)
		await stream.allReady
		const html = await new Response(stream).text()

		expect(html).toContain("Hello")
		expect(loadCommon).toHaveBeenCalledOnce()
		expect(loadCheckout).not.toHaveBeenCalled()
	})

	test("loads only namespaces missing from a provider seed", async () => {
		const loadCommon = vi.fn(async () => ({greeting: "Hello"}))
		const loadCheckout = vi.fn(async () => ({title: "Checkout"}))
		const lazyResources = defineResources({
			fallbackLocale: "en-US",
			loaders: {"en-US": {common: loadCommon, checkout: loadCheckout}}
		})
		const snapshot = (
			await createCore(lazyResources).getTranslation("common", ["en-US"])
		).snapshot
		loadCommon.mockClear()
		const {TranslationProvider, useTranslation} = create(lazyResources)
		const stream = await renderToReadableStream(
			createElement(
				TranslationProvider,
				{initial: snapshot},
				createElement(function Checkout() {
					const {t} = useTranslation(["common", "checkout"])
					return createElement(
						"p",
						null,
						`${t.common.greeting}/${t.checkout.title}`
					)
				})
			)
		)
		await stream.allReady
		const html = await new Response(stream).text()

		expect(html).toContain("Hello/Checkout")
		expect(loadCommon).not.toHaveBeenCalled()
		expect(loadCheckout).toHaveBeenCalledOnce()
	})
})
