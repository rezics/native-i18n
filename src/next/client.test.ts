import {createElement} from "react"
import {renderToReadableStream, renderToString} from "react-dom/server"
import {useRouter} from "next/navigation"
import {afterEach, beforeEach, describe, expect, test, vi} from "vitest"
import {create as createCore, defineResources} from ".."
import {create, type NextClientCreateOptions} from "./client"

vi.mock("next/navigation", () => ({useRouter: vi.fn()}))

const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {common: async () => ({greeting: "Hello"})},
		"zh-Hant": {common: async () => ({greeting: "你好"})}
	}
})

describe("next/client", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	test("does not expose a locale setter when cookie persistence is disabled", () => {
		const options: NextClientCreateOptions = {cookieName: false}
		const client = create(resources, options)
		const disabled = create(resources, {cookieName: false})

		expect(client).not.toHaveProperty("useSetLocale")
		expect(
			// @ts-expect-error `cookieName: false` has no client locale setter.
			disabled.useSetLocale
		).toBeUndefined()
	})

	test("normalizes a locale preference before persisting it", async () => {
		const refresh = vi.fn()
		vi.mocked(useRouter).mockReturnValue({refresh} as unknown as ReturnType<
			typeof useRouter
		>)
		vi.stubGlobal("document", {cookie: ""})
		vi.stubGlobal("location", {protocol: "https:"})
		const {useSetLocale} = create(resources)
		let setLocale: (locale?: string | null) => void = () => undefined

		const stream = await renderToReadableStream(
			createElement(function Locale() {
				setLocale = useSetLocale().setLocale
				return null
			})
		)
		await stream.allReady
		await new Response(stream).text()

		setLocale("zh-hant")

		expect(document.cookie).toBe(
			"NEXT_LOCALE=zh-Hant; Path=/; Max-Age=31536000; SameSite=lax; Secure"
		)
		expect(refresh).toHaveBeenCalledOnce()
	})

	test("ignores an invalid locale preference", async () => {
		const refresh = vi.fn()
		vi.mocked(useRouter).mockReturnValue({refresh} as unknown as ReturnType<
			typeof useRouter
		>)
		vi.stubGlobal("document", {cookie: ""})
		const {useSetLocale} = create(resources)
		let setLocale: (locale?: string | null) => void = () => undefined

		const stream = await renderToReadableStream(
			createElement(function Locale() {
				setLocale = useSetLocale().setLocale
				return null
			})
		)
		await stream.allReady
		await new Response(stream).text()

		setLocale("zh_CN")

		expect(document.cookie).toBe("")
		expect(refresh).not.toHaveBeenCalled()
	})

	test("downgrades SameSite=None without a secure cookie", async () => {
		const refresh = vi.fn()
		vi.mocked(useRouter).mockReturnValue({refresh} as unknown as ReturnType<
			typeof useRouter
		>)
		vi.stubGlobal("document", {cookie: ""})
		vi.stubGlobal("location", {protocol: "http:"})
		const {useSetLocale} = create(resources, {
			cookieSameSite: "none",
			cookieSecure: false
		})
		let setLocale: (locale?: string | null) => void = () => undefined

		const stream = await renderToReadableStream(
			createElement(function Locale() {
				setLocale = useSetLocale().setLocale
				return null
			})
		)
		await stream.allReady
		await new Response(stream).text()

		setLocale("zh-Hant")

		expect(document.cookie).toBe(
			"NEXT_LOCALE=zh-Hant; Path=/; Max-Age=31536000; SameSite=lax"
		)
	})

	test("uses a server-seeded namespace without a provider-wide Suspense boundary", async () => {
		const snapshot = (
			await createCore(resources).getTranslation("common", ["zh-Hant"])
		).snapshot
		const {TranslationProvider, useTranslation} = create(resources)
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

	test("loads a namespace omitted from the server seed", async () => {
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
