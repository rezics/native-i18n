import {
	create,
	currency,
	insert,
	integer,
	plural,
	unused,
	value
} from "../../src/index"
import {toDataFunction} from "../../src/translation"

const greeting = insert("Hello {{name}}. You are {{age}}.", {
	name: String,
	age: integer()
})
greeting({name: "Ada", age: 37})

// @ts-expect-error age is required by the pattern contract.
greeting({name: "Ada"})
// @ts-expect-error unexpected call fields are rejected.
greeting({name: "Ada", age: 37, extra: true})
const incomplete = insert("Hello {{name}} {{age}}", {name: String})
// @ts-expect-error unresolved pattern holes make a top-level message uncallable.
incomplete({name: "Ada", age: 37})
// @ts-expect-error extra bindings must be explicitly marked unused.
insert("Hello {{name}}", {name: String, age: Number})

const localizedGreeting = insert("{{age}}歳", {
	name: unused(String),
	age: integer()
})
localizedGreeting({name: "Ada", age: 37})

const raw = insert("Hello {{node}}", {node: value<{id: number}>()})
raw({node: {id: 1}})
// @ts-expect-error raw values retain their declared input type.
raw({node: "link"})

const files = plural({
	one: insert("{{value}} file"),
	other: insert("{{value}} files")
})
files(2)
// @ts-expect-error plural selectors are numeric.
files("two")

currency("USD")(12n)
// @ts-expect-error currency only accepts number or bigint.
currency("USD")("12")

const customLanguages = [
	{tag: "en", data: {message: (name: string) => name}}
] as const
if (false) {
	// @ts-expect-error custom translation functions are never accepted.
	create(customLanguages)
}

const t = toDataFunction({
	greeting: "Hello",
	items: {apple: "Apple"},
	welcome: greeting
})
t.items.apple
t.welcome({name: "Ada", age: 37})

type TranslationKey = Parameters<typeof t>[0]
const itemKey: TranslationKey = "items.apple"
t(itemKey)
const readTranslation = (key: TranslationKey) => t(key)
readTranslation("greeting")
// @ts-expect-error only leaf paths are accepted.
t("items")
// @ts-expect-error unknown paths are rejected.
t("items.pear")

export {}
