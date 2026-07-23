import {createElement} from "react"
import {renderToString} from "react-dom/server"
import {useRouter} from "next/navigation"
import {beforeEach, describe, expect, test, vi} from "vitest"
import {create as createCore, defineResources} from ".."
import {create} from "./seeded"

vi.mock("next/navigation", () => ({useRouter: vi.fn()}))

const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {
			common: async () => ({greeting: "Hello"}),
			checkout: async () => ({title: "Checkout"})
		}
	}
})

describe("next/seeded", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useRouter).mockReturnValue({
			refresh: vi.fn()
		} as unknown as ReturnType<typeof useRouter>)
	})

	test("keeps missing namespaces as explicit configuration errors", async () => {
		const snapshot = (
			await createCore(resources).getTranslation("common", ["en-US"])
		).snapshot
		const {TranslationProvider, useTranslation} = create<typeof resources>()

		expect(() =>
			renderToString(
				createElement(
					TranslationProvider,
					{initial: snapshot},
					createElement(function Checkout() {
						useTranslation("checkout")
						return null
					})
				)
			)
		).toThrow(/has not seeded namespace "checkout"/)
	})

	test("can omit locale persistence", () => {
		const client = create<typeof resources, {cookieName: false}>({
			cookieName: false
		})

		expect(client).not.toHaveProperty("useSetLocale")
	})
})
