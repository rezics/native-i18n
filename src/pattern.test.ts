import {describe, expect, test} from "vitest"
import {insert} from "./functions"
import {NativeI18nPatternError, compilePattern} from "./pattern"
import {compile, type ContractOf} from "./standard"

describe("Pattern", () => {
	test("supports Mustache variable and delimiter-change tags", () => {
		const message = insert("Hello {{name}}. {{=<% %>=}}<%count%>!", {
			name: String,
			count: Number
		})

		expect(
			compile<ContractOf<typeof message>>(message)({
				name: "Ada",
				count: 2
			})
		).toBe("Hello Ada. 2!")
		expect(compilePattern("{{a}} {{a}}").variables).toEqual(["a"])
	})

	test.each([
		"{{#section}}x{{/section}}",
		"{{! comment }}",
		"{{user.name}}",
		"{{{name}}}"
	])("rejects unsupported Mustache syntax in %s", pattern => {
		expect(() => compilePattern(pattern)).toThrow(NativeI18nPatternError)
	})

	test("treats a bare hash as ordinary text", () => {
		const message = insert("# {{value}}", {value: Number})
		expect(compile<ContractOf<typeof message>>(message)({value: 2})).toBe(
			"# 2"
		)
	})
})
