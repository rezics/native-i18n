# Native I18n

Your translations are your types.

Native I18n keeps translations as ordinary TypeScript data. Standard i18n operations
are real, strongly typed functions at development time and versioned,
serializable recipes when they cross a React Server Components boundary.

There is no schema generation, message compiler, or runtime validation
dependency. TypeScript validates authoring; native Intl implements locale
semantics.

## Installation

```bash
npm install native-i18n
```

React integration requires React 18 or newer. Next.js App Router integration
requires Next.js 15 or newer.

## Quick start

```ts
import {create, currency, insert, integer, plural} from "native-i18n"

const en = {
	tag: "en-US",
	data: {
		greeting: insert("Hello {{name}}. You are {{age}}.", {
			name: String,
			age: integer()
		}),
		files: plural({one: "# file", other: "# files"}),
		price: currency("USD")
	}
} as const

const zh = {
	tag: "zh-CN",
	data: () => import("./zh-CN").then(module => module.default)
} as const

const match = create([en, zh], {timeZone: "UTC"})
const t = await match(navigator.languages)

t.greeting({name: "Ada", age: 37})
t.files(2)
t.price(12)
```

The first language is the synchronous fallback and defines the required shape of
every other language. Later languages may contain data, a synchronous loader, or
an asynchronous loader.

## Standard message functions

### insert and rich values

insert extracts placeholders from a string literal and uses the field map as the
function contract:

```ts
const greeting = insert("Hello {{name}}. {{age}}", {
	name: String,
	age: integer()
})

greeting({name: "Ada", age: 37})
```

Missing placeholders are TypeScript errors:

```ts
insert("Hello {{name}}. {{age}}", {
	name: String
	// TypeScript error: age is missing
})
```

Unexpected fields are also errors. When two locales intentionally share a
function signature but one template does not use a field, mark that decision:

```ts
const japanese = insert("{{age}}歳", {name: unused(String), age: integer()})
```

Use value<T>() for a ReactNode or another value that must not be converted to a
string. The result is an array of string/value parts:

```tsx
const linked = insert("Read {{link}} now", {link: value<React.ReactNode>()})

linked({link: <a href="/docs">the docs</a>})
```

rich is an alias of insert for code that wants to make this intent explicit.

### plural, ordinal, select, and range

```ts
const files = plural({"=0": "No files", "one": "# file", "other": "# files"})

const position = ordinal({one: "#st", two: "#nd", few: "#rd", other: "#th"})

const role = select({admin: "Administrator", other: "Member"})

const size = range(
	[
		{max: 0, value: "empty"},
		{min: 1, max: 9, value: "small"},
		{min: 10, value: "large"}
	],
	"unknown"
)
```

plural and ordinal follow Intl.PluralRules and CLDR semantics. Exact =n cases
win before category selection, other is required, and plural supports offset.
The # token is formatted with the active locale. Choice templates can use the
same typed field maps as insert.

## Standard Intl functions

All formatters are callable functions and are rebound to the actual loaded
language by create:

| Area              | Functions                                         |
| ----------------- | ------------------------------------------------- |
| Numbers           | number, integer, currency, percent, unit, compact |
| Date/time         | date, time, datetime                              |
| Relative/duration | relativeTime, duration                            |
| Composition       | list, displayName                                 |

Examples:

```ts
const data = {
	amount: currency("EUR"),
	progress: percent(),
	distance: unit("kilometer"),
	published: datetime({dateStyle: "medium", timeStyle: "short"}),
	ago: relativeTime("day", {numeric: "auto"}),
	names: list({type: "conjunction"}),
	region: displayName("region")
}
```

Important semantics:

- percent follows Intl exactly: 0.25 means 25%. Native I18n never guesses or divides
  values by 100.
- relativeTime requires an explicit unit, either when the helper is created or
  when it is called. Native I18n does not approximate months or years.
- date/time helpers use the create timeZone. It defaults to UTC for
  deterministic server/client output.
- duration uses native Intl.DurationFormat. Runtimes without it need a
  standards-compliant polyfill before the function is invoked.
- Formatter instances use a bounded cache; the cache cannot grow without limit
  across requests.

createIntl({locale, timeZone}) exposes bound native Intl formatter factories for
advanced cases without adding custom translation functions.

## Matching and locale state

```ts
const result = match(["zh-CN"])

result.locale.current // fallback data available immediately
result.locale.target // best matched target
result.fallback // materialized fallback translation

const data = await result
```

Matching uses BCP 47 tags and best-fit matching. Only the selected loader runs.
DataPromise is a Promise with locale, fallback, tag, and execution context
available immediately.

The immediate DataPromise locale preserves the fallback/current loading state.
Completed server and React translations report the actual loaded locale. If a
client loader fails, current remains the fallback while target preserves the
requested locale.

## React

```tsx
import {create} from "native-i18n/react"
import {languages} from "./languages"

const {useTranslation} = create(languages)

function Page() {
	const {t, locale} = useTranslation()

	return (
		<main lang={locale.current}>
			<h1>{t.greeting}</h1>
			<p>{t.welcome({name: "Ada"})}</p>
		</main>
	)
}
```

useTranslation uses navigator.languages by default. Pass a tag list or {tags,
suspense} to override it. It returns {data, locale, t}; t is both the
translation object and a typed leaf-path lookup:

```ts
t.items.apple
t("items.apple")
t.welcome({name: "Ada"})
t("welcome")({name: "Ada"})
```

## React Server Components

Ordinary JavaScript closures cannot cross an RSC boundary. Native I18n standard
functions can, because the server sends recipes and the client rebuilds
functions with the same locale and time zone.

```ts
// i18n/server.ts
import {create} from "native-i18n/react/server"
import {languages} from "./languages"

export const {getTranslation} = create(languages, {timeZone: "UTC"})
```

```tsx
// Server Component
const translation = await getTranslation(["zh-CN"])

return (
	<TranslationProvider tags={["zh-CN"]} initial={translation.snapshot}>
		{children}
	</TranslationProvider>
)
```

The server result contains:

- data: materialized server functions.
- t: the server-only typed lookup function.
- locale: current and target locale.
- snapshot: function-free recipe data for a Client Component.

Pass snapshot, never the complete server result, across the boundary.
TranslationProvider hydrates the snapshot once and memoizes it.

## Next.js App Router

```ts
// app/i18n/server.ts
import {create} from "native-i18n/next"
import {languages} from "./languages"

export const {getLocaleTags, getTranslation} = create(languages)
```

```ts
// app/i18n/client.ts
"use client"

import {create} from "native-i18n/next/client"
import {languages} from "./languages"

export const {TranslationProvider, useLocale, useSetLocale, useTranslation} =
	create(languages)
```

```tsx
// app/layout.tsx
const tags = await getLocaleTags()
const {locale, snapshot} = await getTranslation(tags)

return (
	<html lang={locale.current}>
		<body>
			<TranslationProvider tags={tags} initial={snapshot}>
				{children}
			</TranslationProvider>
		</body>
	</html>
)
```

getLocaleTags checks NEXT_LOCALE before Accept-Language. Configure cookieName,
cookieMaxAge, cookiePath, cookieSameSite, and cookieSecure in create options.
With cookieName: false, the client result intentionally omits useSetLocale.

Next client translation hooks use Suspense so fallback-language content does not
replace resolved Server Component HTML during hydration.

## Custom functions

Unbranded custom functions are forbidden by default, recursively and at both the
TypeScript and runtime boundaries:

```ts
create([{tag: "en", data: {message: (name: string) => name}}])
// TypeScript error
```

Legacy/native-only code can opt in:

```ts
create(languages, {allowCustomFunctions: true})
```

allowCustomFunctions is marked @deprecated in TypeScript. Custom functions still
execute, so existing flexibility is not removed, but they cannot produce an RSC
snapshot. Prefer insert, plural, select, and the Intl helpers.

## Optional AST and transport tools

The authoring API is function-first. Recipe tools live in a separate entry
point:

```ts
import {
	RECIPE_VERSION,
	compile,
	dehydrate,
	describe,
	hydrate
} from "native-i18n/ast"
```

Use these tools for transport, inspection, editor integrations, or persistence.
Recipes are versioned, unknown versions/operations are rejected, and dehydration
rejects custom functions and circular translation data.

## Examples

Runnable native, React, and Next.js examples are in the examples directory.

## License

MIT
