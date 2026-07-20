import {describe, expect, test} from "vitest"
import {defineResources, insert} from ".."
import {create} from "./server"

const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {
			common: async () => ({
				greeting: "Hello",
				welcome: insert("Hello, {{name}}", {name: String})
			})
		},
		"zh-Hant": {
			common: async () => ({
				greeting: "你好",
				welcome: insert("你好，{{name}}", {name: String})
			})
		}
	}
})

describe("react/server", () => {
	test("returns a scoped translator and serializable namespace snapshot", async () => {
		const {getTranslation} = create(resources)
		const {t, locale, snapshot} = await getTranslation("common", [
			"zh-Hant"
		])

		expect(locale).toEqual({current: "zh-Hant", target: "zh-Hant"})
		expect(t.greeting).toBe("你好")
		expect(t.welcome({name: "Ada"})).toBe("你好，Ada")
		expect(snapshot.namespaces).toHaveProperty("common")
		expect(JSON.stringify(snapshot)).not.toContain("function")
	})
})
