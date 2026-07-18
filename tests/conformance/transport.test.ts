import {describe, expect, test} from "vitest"
import {currency, insert, integer, plural} from "../../src/index"
import {NativeI18nSerializationError, dehydrate, hydrate} from "../../src/ast"
import {create as createServer} from "../../src/react/server"

const containsFunction = (value: unknown): boolean => {
	if (typeof value === "function") return true
	if (Array.isArray(value)) return value.some(containsFunction)
	if (!value || typeof value !== "object") return false
	return Object.values(value).some(containsFunction)
}

describe("v1 transport", () => {
	test("round-trips function-free data through JSON", () => {
		const source = {
			message: insert("{{count}}: {{amount}}", {
				count: integer(),
				amount: currency("USD")
			}),
			files: plural({
				one: insert("{{value}} file"),
				other: insert("{{value}} files")
			})
		}
		const snapshot = dehydrate(source)
		const transported = JSON.parse(
			JSON.stringify(snapshot)
		) as typeof snapshot
		const restored = hydrate<typeof source>(transported, {
			locale: "en-US",
			timeZone: "UTC"
		})

		expect(containsFunction(snapshot)).toBe(false)
		expect(JSON.stringify(snapshot)).not.toContain('"version"')
		expect(restored.message({count: 2, amount: 12})).toBe("2: $12.00")
		expect(restored.files(2)).toBe("2 files")
	})

	test("rejects invalid markers and operations", () => {
		expect(() =>
			hydrate({$nativeI18n: 2, op: "number", options: {}} as never, {
				locale: "en"
			})
		).toThrow(/marker/)
		expect(() =>
			hydrate({$nativeI18n: 1, op: "execute-user-code"} as never, {
				locale: "en"
			})
		).toThrow(/operation/)
	})

	test("rejects custom functions and circular translation data with paths", () => {
		expect(() =>
			dehydrate({nested: {custom: () => "no"}} as never)
		).toThrow(/data\.nested\.custom/)

		const circular: {self?: unknown} = {}
		circular.self = circular
		expect(() => dehydrate(circular)).toThrow(/data\.self/)
	})

	test("produces an RSC-safe snapshot that hydrates identically", async () => {
		const languages = [
			{
				tag: "en-US",
				data: {
					welcome: insert("Hello {{name}}", {name: String}),
					price: currency("USD")
				}
			}
		] as const
		const result = await createServer(languages, {
			timeZone: "UTC"
		}).getTranslation(["en-US"])
		const transported = JSON.parse(
			JSON.stringify(result.snapshot)
		) as typeof result.snapshot
		const restored = hydrate<(typeof languages)[0]["data"]>(
			transported.data,
			transported.context
		)

		expect(containsFunction(result.snapshot)).toBe(false)
		expect(restored.welcome({name: "Ada"})).toBe(
			result.t.welcome({name: "Ada"})
		)
		expect(restored.price(12)).toBe(result.t.price(12))
		expect(transported.locale).toEqual({current: "en-US", target: "en-US"})
	})

	test("uses serialization errors for unsupported transport values", () => {
		expect(() => dehydrate({message: () => "no"} as never)).toThrow(
			NativeI18nSerializationError
		)
	})
})
