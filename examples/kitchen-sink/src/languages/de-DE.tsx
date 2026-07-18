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
		intro: "Alle Standardszenarien in einem ausführbaren Beispiel.",
		description:
			"Jede Zeile zeigt eine typische i18n-Funktion und folgt der aktiven Sprache.",
		locale: "Sprache",
		auto: "Automatisch (Browser)",
		current: "Aktuell",
		target: "Ziel",
		messages: "Nachrichten",
		numbers: "Zahlen",
		dateTime: "Datum & Uhrzeit",
		composition: "Zusammensetzung",
		context: "Formatierungskontext: aktive Sprache · Asia/Shanghai",
		durationUnavailable: "Intl.DurationFormat ist nicht verfügbar"
	},
	messages: {
		greeting: insert("Hallo, {{name}}!", {name: String}),
		files: plural({
			"=0": "Keine Dateien",
			"one": insert("{{value}} Datei"),
			"other": insert("{{value}} Dateien")
		}),
		position: ordinal({other: insert("{{value}}.")}),
		role: select({admin: "Administrator", other: "Mitglied"}),
		bucket: range(
			[
				{max: 0, value: "leer"},
				{min: 1, max: 9, value: "klein"},
				{min: 10, value: "groß"}
			],
			"unbekannt"
		),
		summary: insert("{{name}} hat {{count}} {{noun}}", {
			noun: plural(
				{one: "Nachricht", other: "Nachrichten"},
				{name: String, count: asValue(number())}
			)
		}),
		offset: plural(
			{other: insert("Du und {{pluralValue}} andere mögen das")},
			undefined,
			{offset: 1}
		),
		age: insert("{{name}} ist {{age}} Jahre alt.", {
			name: String,
			age: integer()
		}),
		docs: insert("Lies {{link}} für Hinweise zur Implementierung.", {
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
} satisfies typeof import("./en-US").default
