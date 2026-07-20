import {createElement} from "react"
import {renderToReadableStream, renderToString} from "react-dom/server"
import {describe, expect, test} from "vitest"
import {create} from "./client"

const en = {tag: "en-US", data: {greeting: "Hello"}}
const zh = {tag: "zh-Hant", data: async () => ({greeting: "你好"})}

describe("react/client", () => {
	test("keeps the hydration snapshot on fallback when initial is absent", async () => {
		const {TranslationProvider, preload, useTranslation} = create([en, zh])

		await preload(["zh-Hant"])

		const html = renderToString(
			createElement(
				TranslationProvider,
				{tags: ["zh-Hant"]},
				createElement(function Login() {
					const {t, locale} = useTranslation()

					return createElement(
						"p",
						null,
						`${locale.current}/${locale.target}:${t.greeting}`
					)
				})
			)
		)

		expect(html).toContain("en-US/zh-Hant:Hello")
	})

	test("uses provider initial data for the hydration snapshot", async () => {
		const {TranslationProvider, useTranslation} = create([en, zh])

		const html = renderToString(
			createElement(
				TranslationProvider,
				{
					tags: ["zh-Hant"],
					initial: {
						data: {greeting: "你好"},
						locale: {current: "zh-Hant", target: "zh-Hant"},
						context: {locale: "zh-Hant", timeZone: "UTC"}
					}
				},
				createElement(function Login() {
					const {t, locale} = useTranslation()

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

	test("keeps server translation stores isolated between renders", async () => {
		const {TranslationProvider, useTranslation} = create([
			en,
			{tag: "zh-Hant", data: async () => ({greeting: "loader-value"})}
		])
		const render = async (initial?: {
			readonly data: {readonly greeting: string}
			readonly locale: {
				readonly current: "zh-Hant"
				readonly target: "zh-Hant"
			}
			readonly context: {
				readonly locale: "zh-Hant"
				readonly timeZone: "UTC"
			}
		}) => {
			const providerProps = initial
				? {tags: ["zh-Hant"], initial}
				: {tags: ["zh-Hant"]}
			const stream = await renderToReadableStream(
				createElement(
					TranslationProvider,
					providerProps,
					createElement(function Login() {
						const {t} = useTranslation({suspense: true})

						return createElement("p", null, t.greeting)
					})
				)
			)
			await stream.allReady
			return new Response(stream).text()
		}

		expect(
			await render({
				data: {greeting: "request-A-only"},
				locale: {current: "zh-Hant", target: "zh-Hant"},
				context: {locale: "zh-Hant", timeZone: "UTC"}
			})
		).toContain("request-A-only")
		expect(await render()).toContain("loader-value")
	})
})
