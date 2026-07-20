import {describe, expect, test} from "vitest"
import {
	asValue,
	compile,
	insert,
	integer,
	number,
	ordinal,
	plural,
	range,
	select,
	unused,
	value,
	type ContractOf,
	type StandardNode
} from "../../src/index"

const run = <Node extends StandardNode>(node: Node): ContractOf<Node> =>
	compile(node) as ContractOf<Node>

describe("standard messages", () => {
	test("formats insert fields and explicit unused fields", () => {
		const english = insert("Hello {{name}}. You are {{age}}.", {
			name: String,
			age: integer()
		})
		const japanese = insert("{{age}}歳", {
			name: unused(String),
			age: integer()
		})

		expect(run(english)({name: "Ada", age: 37})).toBe(
			"Hello Ada. You are 37."
		)
		expect(run(japanese)({name: "Ada", age: 37})).toBe("37歳")
	})

	test("preserves raw values as flattened message parts", () => {
		const badge = {type: "strong", text: "Ada"}
		const message = insert("User: {{badge}}!", {
			badge: value<typeof badge>()
		})

		expect(run(message)({badge})).toEqual(["User: ", badge, "!"])
	})

	test("implements plural exact, category, offset and localized values", () => {
		const files = plural({
			"=0": "No files",
			"one": insert("{{value}} file"),
			"other": insert("{{value}} files")
		})
		const offset = plural(
			{other: insert("{{pluralValue}} selected from {{value}}")},
			undefined,
			{offset: 1}
		)

		const formatFiles = run(files)
		expect(formatFiles(0)).toBe("No files")
		expect(formatFiles(1)).toBe("1 file")
		expect(formatFiles(1200)).toBe("1,200 files")
		expect(run(offset)(3)).toBe("2 selected from 3")
	})

	test("implements ordinal categories", () => {
		const position = ordinal({
			one: insert("{{value}}st"),
			two: insert("{{value}}nd"),
			few: insert("{{value}}rd"),
			other: insert("{{value}}th")
		})

		const formatPosition = run(position)
		expect([
			formatPosition(1),
			formatPosition(2),
			formatPosition(3),
			formatPosition(11)
		]).toEqual(["1st", "2nd", "3rd", "11th"])
	})

	test("implements select fallback and inclusive range order", () => {
		const role = select({admin: "Administrator", other: "Member"})
		const bucket = range(
			[
				{max: 0, value: "empty"},
				{min: 1, max: 9, value: "small"},
				{min: 9, value: "large"}
			],
			"unknown"
		)

		const formatRole = run(role)
		const formatBucket = run(bucket)
		expect(formatRole("admin")).toBe("Administrator")
		expect(formatRole("guest")).toBe("Member")
		expect([
			formatBucket(0),
			formatBucket(4),
			formatBucket(9),
			formatBucket(12)
		]).toEqual(["empty", "small", "small", "large"])
	})

	test("composes selectors and message nodes under one parameter scope", () => {
		const summary = insert("{{name}} has {{count}} {{noun}}", {
			noun: plural(
				{one: "file", other: "files"},
				{name: String, count: asValue(number())}
			)
		})

		expect(run(summary)({name: "Ada", count: 2})).toBe("Ada has 2 files")
	})

	test("reports missing contracts, values and required fallback branches", () => {
		const missingContract = run(insert("Hello {{name}}")) as (
			input: unknown
		) => string
		const missingValue = run(insert("Hello {{name}}", {name: String})) as (
			input: unknown
		) => string
		const missingOther = run(plural({one: "one"} as never)) as (
			input: number
		) => string

		expect(() => missingContract({name: "Ada"})).toThrow(/contract/)
		expect(() => missingValue({})).toThrow(/Missing message parameter/)
		expect(() => missingOther(2)).toThrow(/other branch/)
	})
})
