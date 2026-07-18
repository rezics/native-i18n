import {describe, expect, test} from "vitest"
import {create} from "./index"
import {
	NativeI18nSerializationError,
	describe as describeFunction,
	hydrate
} from "./standard"
import {number} from "./functions"

describe("v1 recipe boundary", () => {
	test("uses one recipe marker without a separate version field", () => {
		const recipe = describeFunction(number())

		expect(recipe).toEqual({$nativeI18n: 1, op: "number", options: {}})
		expect(recipe).not.toHaveProperty("version")
	})

	test("rejects non-v1 recipe markers", () => {
		expect(() =>
			hydrate({$nativeI18n: 2, op: "number", options: {}} as never, {
				locale: "en",
				timeZone: "UTC"
			})
		).toThrow(/recipe marker/)
	})
})

describe("custom function boundary", () => {
	test("rejects custom translation functions unconditionally", () => {
		const languages = [
			{tag: "en", data: {message: (name: string) => name}}
		] as const

		expect(() => create(languages as never)).toThrow(
			NativeI18nSerializationError
		)
	})
})
