import {
	compile,
	create as createCore,
	currency,
	defineResources,
	defineTranslationBundle,
	insert,
	integer,
	plural,
	unused,
	value,
	type ContractOf
} from "../../src/index"
import {create as createNextClient} from "../../src/next/client"
import {create as createNextSeededClient} from "../../src/next/seeded"
import {create as createClient} from "../../src/react/factory"
import {toDataFunction} from "../../src/translation"

const greeting = insert("Hello {{name}}. You are {{age}}.", {
	name: String,
	age: integer()
})
const compiledGreeting = compile<ContractOf<typeof greeting>>(greeting)
compiledGreeting({name: "Ada", age: 37})

// @ts-expect-error age is required by the pattern contract.
compiledGreeting({name: "Ada"})
// @ts-expect-error unexpected call fields are rejected.
compiledGreeting({name: "Ada", age: 37, extra: true})
const incompleteNode = insert("Hello {{name}} {{age}}", {name: String})
const incomplete = compile<ContractOf<typeof incompleteNode>>(incompleteNode)
// @ts-expect-error unresolved pattern holes make a top-level message uncallable.
incomplete({name: "Ada", age: 37})
// @ts-expect-error extra bindings must be explicitly marked unused.
insert("Hello {{name}}", {name: String, age: Number})

const localizedGreeting = insert("{{age}}歳", {
	name: unused(String),
	age: integer()
})
compile<ContractOf<typeof localizedGreeting>>(localizedGreeting)({
	name: "Ada",
	age: 37
})

const raw = insert("Hello {{node}}", {node: value<{id: number}>()})
const compiledRaw = compile<ContractOf<typeof raw>>(raw)
compiledRaw({node: {id: 1}})
// @ts-expect-error raw values retain their declared input type.
compiledRaw({node: "link"})

const files = plural({
	one: insert("{{value}} file"),
	other: insert("{{value}} files")
})
const compiledFiles = compile<ContractOf<typeof files>>(files)
compiledFiles(2)
// @ts-expect-error plural selectors are numeric.
compiledFiles("two")

const price = compile<ContractOf<ReturnType<typeof currency>>>(currency("USD"))
price(12n)
// @ts-expect-error currency only accepts number or bigint.
price("12")

const localizedText: ContractOf<"fallback copy"> = "localized copy"
void localizedText

const resources = defineResources({
	fallbackLocale: "en",
	loaders: {
		en: {
			common: () => ({title: "Home"}),
			home: () => ({welcome: greeting})
		},
		de: {
			common: () => ({title: "Startseite"}),
			home: () => ({welcome: greeting})
		}
	}
})
const core = createCore(resources)
core.getTranslation("common", ["de"])
core.getTranslation(["common", "home"], ["de"])
const featureNamespaces = core.defineTranslationBundle(["common", "home"])
core.getTranslation(featureNamespaces, ["de"])
const homeNamespace = featureNamespaces[1]
const exactHomeNamespace: "home" = homeNamespace
void exactHomeNamespace
// @ts-expect-error a namespace selection cannot be empty.
core.getTranslation([], ["de"])
// @ts-expect-error only declared namespaces can be selected.
core.getTranslation("checkout", ["de"])
// @ts-expect-error bundles only accept declared namespaces.
core.defineTranslationBundle(["common", "checkout"])
const defineBundle = defineTranslationBundle<typeof resources>()
const typeOnlyNamespaces = defineBundle(["common", "home"])
core.getTranslation(typeOnlyNamespaces)
// @ts-expect-error type-only bundles retain namespace autocomplete and checks.
defineBundle(["common", "checkout"])

const loaderClient = createClient(resources)
loaderClient.preload("home")
const clientFeatureNamespaces = loaderClient.defineTranslationBundle([
	"common",
	"home"
])
loaderClient.useTranslation(clientFeatureNamespaces)
loaderClient.useTranslation(["common", "home"])
// @ts-expect-error raw arrays only autocomplete and accept declared namespaces.
loaderClient.useTranslation(["common", "checkout"])
const seededClient = createClient<typeof resources>()
// @ts-expect-error a seeded-only client has no runtime preload API.
seededClient.preload("home")
const nextClient = createNextClient(resources)
nextClient.useTranslation(["common", "home"])
const nextSeededClient = createNextSeededClient<typeof resources>()
nextSeededClient.useTranslation(["common", "home"])

if (false) {
	defineResources({
		fallbackLocale: "en",
		loaders: {
			en: {
				// @ts-expect-error translation catalogs cannot contain functions.
				common: () => ({message: (name: string) => name})
			}
		}
	})

	defineResources({
		fallbackLocale: "en",
		loaders: {
			en: {
				common: () => ({title: "Home"}),
				home: () => ({welcome: "Welcome"})
			},
			// @ts-expect-error every locale must expose the fallback namespaces.
			de: {common: () => ({title: "Startseite"})}
		}
	})

	defineResources({
		fallbackLocale: "en",
		loaders: {
			en: {common: () => ({title: "Home"})},
			de: {
				// @ts-expect-error locale namespace contracts must match the fallback.
				common: () => ({title: 42})
			}
		}
	})
}

const t = toDataFunction({
	greeting: "Hello",
	items: {apple: "Apple"},
	welcome: compiledGreeting
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
