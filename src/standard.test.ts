import {describe, expect, test} from "vitest"
import {
	NativeI18nSerializationError,
	compile,
	describe as describeNode,
	hydrate,
	validateData
} from "./standard"
import {number} from "./functions"

describe("v1 recipe boundary", () => {
	test("uses one recipe marker without a separate version field", () => {
		const recipe = describeNode(number())

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

	test("rejects non-serializable recipe options before execution", () => {
		expect(() =>
			compile({
				$nativeI18n: 1,
				op: "number",
				options: {custom: () => undefined}
			} as never)
		).toThrow(NativeI18nSerializationError)
	})
})

describe("custom function boundary", () => {
	test("rejects custom translation functions unconditionally", () => {
		expect(() =>
			validateData({message: (name: string) => name} as never)
		).toThrow(NativeI18nSerializationError)
	})
})
