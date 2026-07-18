import {describe, expect, expectTypeOf, test} from "vitest"
import {asValue, insert, number, plural, select, value} from "./functions"
import {dehydrate, hydrate} from "./standard"

describe("message composition", () => {
	test("declares shared parameters on plural and passes them into insert cases", () => {
		const files = plural(
			{
				one: insert("{{name}} has one file"),
				other: insert("{{name}} has {{value}} files")
			},
			{name: String}
		)

		expectTypeOf(files)
			.parameter(0)
			.toEqualTypeOf<{name: string; value: number}>()
		expect(files({name: "Ada", value: 1})).toBe("Ada has one file")
		expect(files({name: "Ada", value: 2})).toBe("Ada has 2 files")
	})

	test("renames the semantic selector with asValue", () => {
		const files = plural(
			{
				one: insert("{{name}} has one file"),
				other: insert("{{name}} has {{count}} files")
			},
			{name: String, count: asValue(number())}
		)

		expectTypeOf(files)
			.parameter(0)
			.toEqualTypeOf<{name: string; count: number}>()
		expect(files({name: "Ada", count: 3})).toBe("Ada has 3 files")
	})

	test("lets an inner choice provide the outer insert parameter contract", () => {
		const message = insert("{{name}} has {{count}} {{noun}}", {
			noun: plural(
				{one: "file", other: "files"},
				{name: String, count: asValue(number())}
			)
		})

		expectTypeOf(message)
			.parameter(0)
			.toEqualTypeOf<{name: string; count: number}>()
		expect(message({name: "Ada", count: 1})).toBe("Ada has 1 file")
		expect(message({name: "Ada", count: 4})).toBe("Ada has 4 files")
	})

	test("treats plain choice branches as literals", () => {
		const literal = plural({one: "{{value}}", other: "{{value}}"})
		expect(literal(2)).toBe("{{value}}")
	})

	test("provides an offset-only pluralValue local without changing raw value", () => {
		const offset = plural(
			{other: insert("{{pluralValue}} of {{value}}")},
			undefined,
			{offset: 1}
		)

		expect(offset(2)).toBe("1 of 2")
	})

	test("composes raw rich values through nested message nodes", () => {
		const node = {type: "strong", text: "Ada"}
		const selected = select(
			{
				admin: insert("User: {{user}}", {user: value<typeof node>()}),
				other: "Guest"
			},
			{role: asValue(String)}
		)
		expect(selected({role: "admin", user: node})).toEqual(["User: ", node])
	})

	test("survives recipe dehydration and locale-specific hydration", () => {
		const message = plural(
			{
				one: insert("{{name}}: {{value}} file"),
				other: insert("{{name}}: {{value}} files")
			},
			{name: String}
		)
		const data = {message}
		const snapshot = dehydrate(data)
		const restored = hydrate<typeof data>(snapshot, {
			locale: "de-DE",
			timeZone: "UTC"
		})

		expect(restored.message({name: "Ada", value: 1200})).toBe(
			"Ada: 1.200 files"
		)
	})
})
