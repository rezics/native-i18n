import type {ReactNode} from "react"
import {
	asValue,
	compact,
	currency,
	date,
	datetime,
	displayName,
	duration,
	insert,
	integer,
	list,
	number,
	ordinal,
	percent,
	plural,
	range,
	relativeTime,
	select,
	time,
	unit,
	value
} from "native-i18n"

export default {
	chrome: {
		intro: "Every standard scenario, in one runnable example.",
		description:
			"Each row demonstrates a common i18n capability and updates with the active locale.",
		locale: "Locale",
		auto: "Auto (browser)",
		current: "Current",
		target: "Target",
		messages: "Messages",
		numbers: "Numbers",
		dateTime: "Date & time",
		composition: "Composition",
		context: "Formatting context: active locale · Asia/Shanghai",
		durationUnavailable: "Intl.DurationFormat unavailable"
	},
	messages: {
		greeting: insert("Hello, {{name}}!", {name: String}),
		files: plural({
			"=0": "No files",
			"one": insert("{{value}} file"),
			"other": insert("{{value}} files")
		}),
		position: ordinal({
			one: insert("{{value}}st"),
			two: insert("{{value}}nd"),
			few: insert("{{value}}rd"),
			other: insert("{{value}}th")
		}),
		role: select({admin: "Administrator", other: "Member"}),
		bucket: range(
			[
				{max: 0, value: "empty"},
				{min: 1, max: 9, value: "small"},
				{min: 10, value: "large"}
			],
			"unknown"
		),
		summary: insert("{{name}} has {{count}} {{noun}}", {
			noun: plural(
				{one: "message", other: "messages"},
				{name: String, count: asValue(number())}
			)
		}),
		offset: plural(
			{other: insert("You and {{pluralValue}} others liked this")},
			undefined,
			{offset: 1}
		),
		age: insert("{{name}} is {{age}} years old.", {
			name: String,
			age: integer()
		}),
		docs: insert("Read {{link}} for the implementation notes.", {
			link: value<ReactNode>()
		})
	},
	formats: {
		number: number({maximumFractionDigits: 2}),
		integer: integer(),
		currency: currency("EUR"),
		percent: percent({maximumFractionDigits: 1}),
		unit: unit("kilometer-per-hour"),
		compact: compact(),
		date: date({dateStyle: "long"}),
		time: time({timeStyle: "medium"}),
		datetime: datetime({dateStyle: "medium", timeStyle: "short"}),
		relative: relativeTime("day", {numeric: "auto"}),
		duration: duration({style: "long"}),
		list: list({type: "conjunction"}),
		region: displayName("region")
	}
}
