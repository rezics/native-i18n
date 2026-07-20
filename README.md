# Native I18n

Your translations are your types.

Native I18n keeps each translation namespace as ordinary, serializable
TypeScript data. Locale and namespace loaders are explicit async boundaries;
TypeScript derives the callable translation contract from the fallback locale.

There is no schema generation, message compiler, catalog-defined function, or
runtime validation dependency. Standard message and Intl helpers create pure
recipe objects, and Native I18n materializes those recipes for the resolved
locale at runtime.

## Installation

```bash
npm install native-i18n
```

React integration requires React 19 or newer. Next.js App Router integration
requires Next.js 15 or newer.

## Resources and namespaces

Declare every locale and namespace with a statically analyzable loader:

```ts
// i18n/resources.ts
import {defineResources} from "native-i18n"

export const resources = defineResources({
	fallbackLocale: "en-US",
	loaders: {
		"en-US": {
			common: () =>
				import("./messages/en-US/common").then(m => m.default),
			home: () => import("./messages/en-US/home").then(m => m.default)
		},
		"zh-Hant": {
			common: () =>
				import("./messages/zh-Hant/common").then(m => m.default),
			home: () => import("./messages/zh-Hant/home").then(m => m.default)
		}
	}
})
```

Every locale must expose exactly the fallback locale's namespace names. A loader
may return data synchronously, but dynamic `import()` is recommended for
translation modules because it gives the bundler an explicit locale × namespace
loading boundary.

Use the fallback module as the authoring contract for each translation:

```ts
// messages/zh-Hant/home.ts
import {insert, plural} from "native-i18n"

export default {
	title: "首頁",
	welcome: insert("歡迎，{{name}}！", {name: String}),
	items: plural({other: insert("{{value}} 件物品")})
} satisfies typeof import("../en-US/home").default
```

Native I18n owns namespace resolution, loading, deduplication, caching,
transport, and typing. How an application divides its copy is an application
decision. A useful default is a small `common` namespace plus route or feature
namespaces. Avoid turning `common` into the whole application, and avoid tiny
namespaces that are always requested together.

### Namespace loading is not tree-shaking

These mechanisms solve different problems:

- ESM tree-shaking removes unused library exports from a bundle. Native I18n
  publishes ESM entry points and declares `sideEffects: false` to support it.
- Namespace loading keeps translation modules out of the initial execution path
  until their loader is requested.

Calling `getTranslation("home")` loads the complete selected namespace; it does
not remove unused keys within that namespace. Each explicit dynamic import is an
async module boundary, although the final number and names of physical chunks
remain a bundler decision.

## Core API

```ts
import {create} from "native-i18n"
import {resources} from "./i18n/resources"

const i18n = create(resources, {timeZone: "UTC"})

const {t, locale} = await i18n.getTranslation(["common", "home"] as const, [
	"zh-Hant",
	"en-US"
])

t.common.back
t.home.welcome({name: "Ada"})
locale.current // "zh-Hant"
```

A string selection scopes `t` directly to that namespace. An array selection
returns an object keyed by namespace. Multiple namespaces load concurrently and
are cached by resolved locale plus namespace. Failed loads are not retained, so
a later request can retry.

Locale matching uses normalized BCP 47 tags and best-fit matching. It never
loads an entire fallback catalog eagerly: the fallback locale is metadata and
uses the same namespace loaders as every other locale.

## Serializable standard recipes

Static translations stay plain values. Standard helpers return serializable
recipe nodes, not functions:

```ts
import {currency, insert, plural} from "native-i18n"

export default {
	title: "Account",
	welcome: insert("Welcome, {{name}}!", {name: String}),
	files: plural({one: "one file", other: insert("{{value}} files")}),
	price: currency("USD")
}
```

After loading, Native I18n materializes the same shape with strongly typed
callables:

```ts
t.welcome({name: "Ada"})
t.files(2)
t.price(12)
```

Catalog-defined JavaScript functions are deliberately unsupported, recursively:

```ts
defineResources({
	fallbackLocale: "en",
	loaders: {en: {common: () => ({message: (name: string) => name})}}
})
// TypeScript error; runtime validation also rejects it.
```

This single pure-data model makes namespaces safe to cache, serialize through
React Server Components, inspect, persist, and hydrate without executing catalog
code. It also removes the former distinction between specially branded functions
and transport recipes.

### Messages

`insert` parses a deliberately small Pattern subset: variable tags and
set-delimiter tags are supported; sections, partials, comments, dotted names,
HTML escaping, and unescaped-variable tags are rejected.

```ts
import {asValue, insert, number, plural} from "native-i18n"

const files = plural(
	{
		one: insert("{{name}} has one file"),
		other: insert("{{name}} has {{count}} files")
	},
	{name: String, count: asValue(number())}
)
```

Message nodes compose as a tree. Use `insert()` for branch text containing
Pattern variables, `asValue()` to name a choice selector, `unused()` to retain a
parameter only for contract parity, and `value<T>()` for values such as
`ReactNode` that must not be stringified.

`plural` and `ordinal` use `Intl.PluralRules`; exact `=n` cases win before
category selection and `other` is required. `select` uses string keys. `range`
selects the first inclusive range. A bare `#` has no special meaning.

### Intl formatters

| Area              | Helpers                                           |
| ----------------- | ------------------------------------------------- |
| Numbers           | number, integer, currency, percent, unit, compact |
| Date/time         | date, time, datetime                              |
| Relative/duration | relativeTime, duration                            |
| Composition       | list, displayName                                 |

The helpers follow native `Intl` semantics. In particular, `percent()` treats
`0.25` as 25%, `relativeTime` requires an explicit unit, and date/time helpers
use the configured time zone (UTC by default) for deterministic server/client
output. `duration` requires `Intl.DurationFormat` or a standards-compliant
polyfill.

## React

For a client-rendered React application, give the client factory the runtime
resource registry:

```ts
// i18n.ts
import {create} from "native-i18n/react"
import {resources} from "./resources"

export const {TranslationProvider, preload, useLocale, useTranslation} =
	create(resources)
```

```tsx
function Page() {
	const {t, locale} = useTranslation("home")

	return <h1 lang={locale.current}>{t.welcome({name: "Ada"})}</h1>
}
```

`useTranslation(selection, {tags})` and core/server `getTranslation` are thin
adapters over the same namespace resolver and return the same `data`, `t`, and
locale model. They remain separate APIs because one is a React hook and the
other is asynchronous server/framework code.

When a loader-backed client requests a namespace that is not cached, the hook
reads its cached Promise with React `use`, activating the nearest Suspense
boundary. Put that boundary around the smallest UI region that needs lazy
translations:

```tsx
<Suspense fallback={<PageSkeleton />}>
	<Page />
</Suspense>
```

There is no `suspense` switch and no provider-wide boundary. Concurrent requests
for the same locale and namespace share one pending load.

Property access is the primary API. `t` also supports typed string paths when a
translation key genuinely needs to be passed as data:

```ts
t.items.apple
t("items.apple")
```

## React Server Components

Server code loads only the namespaces it needs and passes the returned snapshot,
never the materialized server result, to a Client Component:

```ts
// i18n/server.ts
import {create} from "native-i18n/react/server"
import {resources} from "./resources"

export const {getTranslation} = create(resources)
```

Use the seeded client entry so no loader registry or core resolver enters the
client graph:

```ts
// i18n/client.ts
"use client"

import {create} from "native-i18n/react/seeded"
import type {resources} from "./resources"

export const {TranslationProvider, useLocale, useTranslation} =
	create<typeof resources>()
```

```tsx
const {snapshot} = await getTranslation("common", ["zh-Hant"])

return <TranslationProvider initial={snapshot}>{children}</TranslationProvider>
```

Snapshots contain only the selected namespace data and execution context. Nested
providers share the same locale × namespace cache, so a route can seed
additional namespaces without resending those already available.

## Next.js App Router

Keep the loader registry in a server-only module:

```ts
// app/i18n/resources.ts
import "server-only"

import {defineResources} from "native-i18n"

export const resources = defineResources({
	/* explicit loaders */
})
```

```ts
// app/i18n/server.ts
import {create} from "native-i18n/next/server"
import {resources} from "./resources"

export const {getLocaleTags, getTranslation, matchLocale, preload} =
	create(resources)
```

The client imports only its type. No loader or translation module enters the
client graph:

```ts
// app/i18n/client.ts
"use client"

import {create} from "native-i18n/next/client"
import type {resources} from "./resources"

export const {TranslationProvider, useLocale, useSetLocale, useTranslation} =
	create<typeof resources>()
```

Seed only client-consumed namespaces. For example, a root layout can provide a
small `common` namespace while a page reads `home` exclusively on the server:

```tsx
// app/layout.tsx
const {locale, snapshot} = await getTranslation("common")

return (
	<html lang={locale.current}>
		<body>
			<TranslationProvider initial={snapshot}>
				{children}
			</TranslationProvider>
		</body>
	</html>
)
```

```tsx
// app/page.tsx — Server Component
const {t} = await getTranslation("home")
return <h1>{t.title}</h1>
```

The seeded Next client path is synchronous and does not enable a separate Native
I18n Suspense mode. Missing client namespaces are configuration errors. Next
route loading and streaming boundaries remain responsible for navigation UX.
`useSetLocale()` writes the locale cookie and performs `router.refresh()` in a
transition, returning `{isPending, setLocale}`.

`getLocaleTags()` checks `NEXT_LOCALE` before `Accept-Language`. Set
`cookieName: false` to disable cookie locale selection and omit `useSetLocale`
from the client factory result.

## AST and transport tools

Low-level pure-data tools live at `native-i18n/ast`:

```ts
import {compile, describe, hydrate, validateData} from "native-i18n/ast"
```

- `compile(recipe, context)` materializes one recipe.
- `hydrate(data, context)` recursively materializes a namespace or snapshot.
- `validateData(data)` verifies the pure serializable catalog contract.
- `describe(recipe)` returns a readable representation for tooling.

Unknown recipe operations, custom functions, circular structures, non-finite
numbers, non-plain objects, and symbol-keyed data are rejected.

## Examples

| Example        | Focus                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `native-basic` | Framework-free locale × namespace loading.                                                     |
| `react-basic`  | Client loaders, localized Suspense, and multi-namespace selection.                             |
| `next-basic`   | Server-only registry, type-only client setup, selective RSC snapshots, and locale transitions. |
| `kitchen-sink` | Complete standard message and Intl recipe surface.                                             |

## Verification

```bash
yarn test          # runtime, integration, and conformance tests
yarn test:types    # authoring contracts and negative TypeScript cases
yarn test:examples # package build plus every consumer build
yarn verify        # all of the above
```

Publishing runs the complete `yarn verify` gate.

## License

MIT
