import {describe, expect, test} from "vitest"
import {
	compact,
	create,
	createIntl,
	currency,
	date,
	datetime,
	displayName,
	duration,
	integer,
	list,
	number,
	percent,
	relativeTime,
	time,
	unit
} from "../../src/index"

const context = {locale: "en-US", timeZone: "UTC"} as const

describe("standard Intl formatters", () => {
	test("covers number, integer, currency, percent, unit and compact", () => {
		expect(number({maximumFractionDigits: 1})(1234.56)).toBe(
			new Intl.NumberFormat("en", {maximumFractionDigits: 1}).format(
				1234.56
			)
		)
		expect(integer()(12.8)).toBe(
			new Intl.NumberFormat("en", {
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			}).format(12.8)
		)
		expect(currency("USD")(12)).toBe(
			new Intl.NumberFormat("en", {
				style: "currency",
				currency: "USD"
			}).format(12)
		)
		expect(percent()(0.25)).toBe(
			new Intl.NumberFormat("en", {style: "percent"}).format(0.25)
		)
		expect(unit("kilometer")(2)).toBe(
			new Intl.NumberFormat("en", {
				style: "unit",
				unit: "kilometer"
			}).format(2)
		)
		expect(compact()(1200)).toBe(
			new Intl.NumberFormat("en", {notation: "compact"}).format(1200)
		)
	})

	test("binds locale and deterministic time zone through create", async () => {
		const formatters = {
			day: date({dateStyle: "short"}),
			clock: time({timeStyle: "short"}),
			stamp: datetime({dateStyle: "short", timeStyle: "short"})
		}
		const languages = [
			{tag: "en-US", data: formatters},
			{tag: "de-DE", data: formatters}
		] as const
		const data = await create(languages, {timeZone: "Asia/Shanghai"})([
			"de-DE"
		])
		const instant = Date.UTC(2024, 0, 2, 15, 4)

		expect(data.day(instant)).toBe(
			new Intl.DateTimeFormat("de-DE", {
				dateStyle: "short",
				timeZone: "Asia/Shanghai"
			}).format(instant)
		)
		expect(data.clock(instant)).toBe(
			new Intl.DateTimeFormat("de-DE", {
				timeStyle: "short",
				timeZone: "Asia/Shanghai"
			}).format(instant)
		)
		expect(data.stamp(instant)).toBe(
			new Intl.DateTimeFormat("de-DE", {
				dateStyle: "short",
				timeStyle: "short",
				timeZone: "Asia/Shanghai"
			}).format(instant)
		)
	})

	test("covers relative time, list and display names", () => {
		expect(relativeTime("day", {numeric: "always"})(-1)).toBe(
			new Intl.RelativeTimeFormat("en", {numeric: "always"}).format(
				-1,
				"day"
			)
		)
		expect(relativeTime({numeric: "auto"})(0, "day")).toBe(
			new Intl.RelativeTimeFormat("en", {numeric: "auto"}).format(
				0,
				"day"
			)
		)
		expect(list({type: "conjunction"})(["a", "b", "c"])).toBe(
			new Intl.ListFormat("en", {type: "conjunction"}).format([
				"a",
				"b",
				"c"
			])
		)
		expect(displayName("region")("US")).toBe(
			new Intl.DisplayNames("en", {type: "region"}).of("US")
		)
	})

	test("uses native DurationFormat or reports its absence", () => {
		const DurationFormat = (
			Intl as unknown as {DurationFormat?: new () => unknown}
		).DurationFormat

		if (DurationFormat)
			expect(duration()({hours: 1, minutes: 30})).toBeTruthy()
		else
			expect(() => duration()({hours: 1})).toThrow(/Intl\.DurationFormat/)
	})

	test("exposes locale-bound native Intl factories", () => {
		const intl = createIntl(context)

		expect(intl.numberFormat().format(1234)).toBe("1,234")
		expect(
			intl.dateTimeFormat({dateStyle: "short"}).resolvedOptions()
		).toMatchObject({locale: "en-US", timeZone: "UTC"})
		expect(intl.pluralRules().select(1)).toBe("one")
		expect(intl.relativeTimeFormat().format(-1, "day")).toBe("1 day ago")
		expect(intl.listFormat().format(["a", "b"])).toBe("a and b")
		expect(intl.displayNames({type: "region"}).of("US")).toBe(
			"United States"
		)
	})
})
